import crypto from 'crypto';
import { prisma } from './prisma';
import { cosineSimilarity } from './geminiEmbeddings';

export interface StoredChunk {
  id: string;
  projectId: string;
  pipelineId?: string | null;
  runId?: string | null;
  chunkIndex: number;
  content: string;
  metadata?: any;
  similarity?: number;
}

/**
 * Computes a deterministic SHA-256 fingerprint for document content and chunk settings.
 */
export function calculateDocumentFingerprint(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string {
  return crypto
    .createHash('sha256')
    .update(`${text.trim()}::${chunkSize}::${chunkOverlap}`)
    .digest('hex');
}

/**
 * Checks if chunks for this exact document and chunk settings already exist in pgvector.
 * If found, returns the cached chunks and vector arrays without calling embedding APIs.
 */
export async function getCachedPipelineChunks(
  pipelineId: string,
  fingerprint: string
): Promise<{ chunks: string[]; embeddings: number[][] } | null> {
  if (!pipelineId || !fingerprint) return null;

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT 
        "content",
        "embedding"::text AS embedding_str
      FROM "DocumentChunk"
      WHERE "pipelineId" = $1
        AND "metadata"->>'fingerprint' = $2
      ORDER BY "chunkIndex" ASC
      `,
      pipelineId,
      fingerprint
    );

    if (!rows || rows.length === 0) return null;

    const chunks: string[] = [];
    const embeddings: number[][] = [];

    for (const row of rows) {
      chunks.push(row.content);
      if (row.embedding_str) {
        const raw = row.embedding_str.replace(/[\[\]]/g, '').trim();
        const vector = raw ? raw.split(',').map(Number) : [];
        embeddings.push(vector);
      }
    }

    if (chunks.length > 0 && embeddings.length === chunks.length) {
      return { chunks, embeddings };
    }

    return null;
  } catch (err) {
    console.warn('[VectorStore] Cache lookup skipped:', err);
    return null;
  }
}

/**
 * Deletes older chunks for this pipeline when a new document or updated settings are provided.
 */
export async function deletePipelineChunks(pipelineId: string): Promise<void> {
  if (!pipelineId) return;
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "DocumentChunk" WHERE "pipelineId" = $1`,
      pipelineId
    );
  } catch (err) {
    console.warn('[VectorStore] Failed to delete outdated pipeline chunks:', err);
  }
}

/**
 * Stores document chunks with their dense vector embeddings into PostgreSQL.
 * Uses raw SQL to insert into pgvector column if available.
 */
export async function saveDocumentChunksWithEmbeddings(params: {
  projectId: string;
  pipelineId?: string;
  runId?: string;
  chunks: string[];
  embeddings: number[][];
  metadata?: Record<string, any>;
}): Promise<void> {
  const { projectId, pipelineId, runId, chunks, embeddings, metadata = {} } = params;
  if (chunks.length === 0 || chunks.length !== embeddings.length) return;

  try {
    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      const embeddingStr = `[${embeddings[i].join(',')}]`;

      await prisma.$executeRawUnsafe(
        `
        INSERT INTO "DocumentChunk" ("id", "projectId", "pipelineId", "runId", "chunkIndex", "content", "metadata", "embedding", "createdAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::jsonb, $7::vector, NOW())
        `,
        projectId,
        pipelineId || null,
        runId || null,
        i,
        content,
        JSON.stringify(metadata),
        embeddingStr
      );
    }
  } catch (err) {
    // If the table or vector extension doesn't exist yet, log warning
    console.warn('[VectorStore] Database persistence skipped or table not initialized:', err);
  }
}

/**
 * Performs semantic similarity search using pgvector Cosine Distance (<=>).
 * Returns Top-K chunks ordered by highest cosine similarity.
 */
export async function searchSimilarChunksInDB(params: {
  projectId: string;
  pipelineId?: string;
  queryVector: number[];
  topK?: number;
  threshold?: number;
}): Promise<StoredChunk[]> {
  const { projectId, pipelineId, queryVector, topK = 3, threshold = 0.0 } = params;
  const vectorStr = `[${queryVector.join(',')}]`;

  try {
    const results = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT 
        "id",
        "projectId",
        "pipelineId",
        "runId",
        "chunkIndex",
        "content",
        "metadata",
        1 - ("embedding" <=> $1::vector) AS similarity
      FROM "DocumentChunk"
      WHERE "projectId" = $2
        ${pipelineId ? 'AND "pipelineId" = $3' : ''}
      ORDER BY "embedding" <=> $1::vector ASC
      LIMIT $4
      `,
      vectorStr,
      projectId,
      ...(pipelineId ? [pipelineId, topK] : [topK])
    );

    return results
      .map((row) => ({
        id: row.id,
        projectId: row.projectId,
        pipelineId: row.pipelineId,
        runId: row.runId,
        chunkIndex: row.chunkIndex,
        content: row.content,
        metadata: row.metadata,
        similarity: typeof row.similarity === 'number' ? Number(row.similarity.toFixed(4)) : 0
      }))
      .filter((r) => (r.similarity ?? 0) >= threshold);
  } catch (err) {
    console.warn('[VectorStore] pgvector search failed or table does not exist:', err);
    return [];
  }
}

/**
 * In-memory fallback for dynamic pipeline runs:
 * Computes cosine similarity between query vector and candidate chunk vectors on-the-fly.
 */
export function searchSimilarChunksInMemory(params: {
  chunks: string[];
  chunkEmbeddings: number[][];
  queryVector: number[];
  topK?: number;
  threshold?: number;
}): Array<{ chunk: string; score: number; index: number }> {
  const { chunks, chunkEmbeddings, queryVector, topK = 3, threshold = 0.0 } = params;

  const scored = chunks.map((chunk, index) => {
    const embedding = chunkEmbeddings[index];
    const score = embedding ? cosineSimilarity(queryVector, embedding) : 0;
    return { chunk, score: Number(score.toFixed(4)), index };
  });

  return scored
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
