import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from './geminiEmbeddings';
import { searchSimilarChunksInMemory } from './vectorStore';

describe('Vector Search and Cosine Similarity', () => {
  it('computes 1.0 similarity for identical vectors', () => {
    const v1 = [0.5, 0.5, 0.5, 0.5];
    const v2 = [0.5, 0.5, 0.5, 0.5];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 4);
  });

  it('computes 0.0 similarity for orthogonal vectors', () => {
    const v1 = [1, 0, 0];
    const v2 = [0, 1, 0];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(0.0, 4);
  });

  it('computes -1.0 similarity for opposite vectors', () => {
    const v1 = [1, 0, 0];
    const v2 = [-1, 0, 0];
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(-1.0, 4);
  });

  it('correctly ranks chunks by semantic cosine similarity and filters by threshold', () => {
    const chunks = [
      'Document about refund policies and item returns.',
      'Information on flight ticket booking and travel.',
      'How to request a chargeback or refund for defective products.'
    ];

    // Mock 3-dim vectors:
    // Query vector focuses on refund/returns
    const queryVector = [0.9, 0.1, 0.1];
    const chunkEmbeddings = [
      [0.85, 0.12, 0.05], // high similarity to refund
      [0.05, 0.95, 0.10], // travel, low similarity
      [0.92, 0.08, 0.03]  // highest similarity to refund
    ];

    const results = searchSimilarChunksInMemory({
      chunks,
      chunkEmbeddings,
      queryVector,
      topK: 2,
      threshold: 0.5
    });

    expect(results).toHaveLength(2);
    expect(results[0].chunk).toContain('refund');
    expect(results[0].score).toBeGreaterThan(0.9);
    expect(results[1].chunk).toContain('refund');
    expect(results[1].score).toBeGreaterThan(0.9);
  });
});
