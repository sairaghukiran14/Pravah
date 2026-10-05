/**
 * Google Gemini Embedding Service for Pravah.
 * Model: text-embedding-004 (768-dimensional dense semantic vectors)
 */

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

/**
 * Calculates the dot product of two normalized vectors (Cosine Similarity).
 * For normalized vectors, dot product is equal to cosine similarity.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generates a dense semantic vector embedding using Google Gemini API.
 */
export async function getGeminiEmbedding(
  text: string,
  apiKey?: string,
  modelName: string = 'gemini-embedding-2'
): Promise<number[]> {
  const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is not configured in environment or node config.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${key}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: `models/${modelName}`,
      content: {
        parts: [{ text: text.trim() }]
      },
      outputDimensionality: 768
    })
  });

  if (!response.ok) {
    // If gemini-embedding-2 fails, attempt fallback with gemini-embedding-001
    if (modelName === 'gemini-embedding-2') {
      return getGeminiEmbedding(text, apiKey, 'gemini-embedding-001');
    }
    const errorText = await response.text();
    throw new Error(`Google Gemini Embedding API failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Google Gemini returned an invalid or empty embedding vector.');
  }

  return values;
}

/**
 * Generates embeddings for multiple chunks in batch.
 */
export async function getGeminiBatchEmbeddings(
  texts: string[],
  apiKey?: string
): Promise<number[][]> {
  const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is not configured in environment or node config.');
  }

  if (texts.length === 0) return [];

  // Generate embeddings concurrently
  const results = await Promise.all(
    texts.map((t) => getGeminiEmbedding(t, key))
  );

  return results;
}

