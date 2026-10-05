-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Ensure pgvector column exists on DocumentChunk
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'DocumentChunk' AND column_name = 'embedding'
    ) THEN
        ALTER TABLE "DocumentChunk" ADD COLUMN "embedding" vector(768);
    END IF;
END $$;

-- Create HNSW index for fast Cosine Distance vector search
CREATE INDEX IF NOT EXISTS document_chunk_embedding_hnsw_idx 
ON "DocumentChunk" 
USING hnsw ("embedding" vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
