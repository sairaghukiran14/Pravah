import { describe, it, expect } from 'vitest';
import { generateTextDiff, compareEvalRuns } from './regression';

describe('Regression & Comparison Engine Suite', () => {
  describe('1. Word-Level Levenshtein Diff Generator', () => {
    it('produces exact hit list for identical text', () => {
      const v1 = 'hello world from pravah pipeline';
      const v2 = 'hello world from pravah pipeline';
      const diff = generateTextDiff(v1, v2);

      expect(diff.every(d => d.type === 'hit')).toBe(true);
      expect(diff.map(d => d.value).join(' ')).toBe(v1);
    });

    it('identifies word additions accurately', () => {
      const v1 = 'hello world';
      const v2 = 'hello beautiful brave world';
      const diff = generateTextDiff(v1, v2);

      const added = diff.filter(d => d.type === 'added');
      expect(added.length).toBe(2);
      expect(added.map(a => a.value)).toEqual(['beautiful', 'brave']);
    });

    it('identifies word deletions accurately', () => {
      const v1 = 'hello beautiful world from pipeline';
      const v2 = 'hello world pipeline';
      const diff = generateTextDiff(v1, v2);

      const removed = diff.filter(d => d.type === 'removed');
      expect(removed.length).toBe(2);
      expect(removed.map(r => r.value)).toEqual(['beautiful', 'from']);
    });

    it('handles substitution by pairing removal and addition', () => {
      const v1 = 'hello translating world';
      const v2 = 'hello transliterating world';
      const diff = generateTextDiff(v1, v2);

      const removed = diff.find(d => d.type === 'removed');
      const added = diff.find(d => d.type === 'added');

      expect(removed?.value).toBe('translating');
      expect(added?.value).toBe('transliterating');
    });
  });

  describe('2. A/B Run Comparison delta metrics', () => {
    it('correctly calculates overall summary improvements and regressions', () => {
      const mockV1Run = {
        id: 'run_v1',
        datasetId: 'dataset_1',
        results: [
          {
            datasetItemId: 'item_1',
            status: 'failed',
            durationMs: 800,
            cost: 0.15,
            scores: { wer: 0.22, bleu: 0.65 },
            actualOutput: { text: 'hello bad output' },
            datasetItem: { name: 'Item 1', input: {}, expectedOutput: {} }
          },
          {
            datasetItemId: 'item_2',
            status: 'passed',
            durationMs: 400,
            cost: 0.10,
            scores: { wer: 0.05, bleu: 0.85 },
            actualOutput: { text: 'perfect matched output' },
            datasetItem: { name: 'Item 2', input: {}, expectedOutput: {} }
          }
        ]
      };

      const mockV2Run = {
        id: 'run_v2',
        datasetId: 'dataset_1',
        results: [
          {
            datasetItemId: 'item_1',
            status: 'passed', // Improved!
            durationMs: 650,  // Latency decreased
            cost: 0.15,
            scores: { wer: 0.04, bleu: 0.92 }, // Scores increased
            actualOutput: { text: 'hello good output' },
            datasetItem: { name: 'Item 1', input: {}, expectedOutput: {} }
          },
          {
            datasetItemId: 'item_2',
            status: 'passed', // Unchanged
            durationMs: 380,
            cost: 0.12,       // Cost slightly increased
            scores: { wer: 0.05, bleu: 0.85 },
            actualOutput: { text: 'perfect matched output' },
            datasetItem: { name: 'Item 2', input: {}, expectedOutput: {} }
          }
        ]
      };

      const { summary, results } = compareEvalRuns(mockV1Run, mockV2Run);

      expect(summary.improvedCount).toBe(1);
      expect(summary.regressedCount).toBe(0);
      expect(summary.unchangedCount).toBe(1);

      expect(summary.deltaPassRate).toBe(50.0); // v1 had 50%, v2 has 100%
      expect(summary.deltaWer).toBeCloseTo(-0.09, 3); // (0.045 - 0.135)
      expect(summary.deltaBleu).toBeCloseTo(0.135, 3); // (0.885 - 0.75)
      expect(summary.deltaLatency).toBeCloseTo(-85, 1); // average v2 (515) - average v1 (600)
      expect(summary.deltaCost).toBeCloseTo(0.02, 3);  // cost increased from 0.25 to 0.27
    });
  });
});
