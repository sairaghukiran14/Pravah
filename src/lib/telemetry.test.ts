import { describe, it, expect, vi } from 'vitest';
import { executeSingleNode, sortNodesTopologically } from './execution';
import { nodeCost } from './api/pricing';
import type { SerializedNode, SerializedEdge } from '@/types/pipeline';

describe('Trace Telemetry & Node Execution Metrics', () => {
  it('measures execution duration and token usage for text nodes', async () => {
    const textNode: SerializedNode = {
      id: 'text_1',
      type: 'text_input',
      label: 'Input Prompt',
      positionX: 0,
      positionY: 0,
      config: { text: 'Hello, world! This is a test trace prompt.' },
    };

    const result = await executeSingleNode(textNode, [], {}, '');

    expect(result.status).toBe('completed');
    expect(result.nodeId).toBe('text_1');
    expect(result.nodeType).toBe('text_input');
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.retryCount).toBe(0);
    expect(result.tokenUsage).toBeDefined();
    expect(result.tokenUsage?.charCount).toBeGreaterThan(0);
  });

  it('calculates accurate pricing for STT, translation and TTS nodes', () => {
    const sampleText = 'Short test text consisting of characters.';
    const translateCost = nodeCost('translate', { text: sampleText });
    expect(translateCost).toBeCloseTo(sampleText.length * 0.003, 4);

    const sttCost = nodeCost('stt', { payload: { durationSeconds: 45 } });
    expect(sttCost).toBe(0.375 * 2); // 2 segments (30s max per segment)

    const freeCost = nodeCost('text_input', { text: 'Hello' });
    expect(freeCost).toBe(0);
  });

  it('handles failed node telemetry gracefully with error details and duration', async () => {
    const faultyNode: SerializedNode = {
      id: 'faulty_1',
      type: 'router',
      label: 'Faulty Router',
      positionX: 0,
      positionY: 0,
      config: { condition_type: 'unknown_type' },
    };

    const result = await executeSingleNode(faultyNode, [], {}, 'test');

    expect(result.nodeId).toBe('faulty_1');
    expect(typeof result.durationMs).toBe('number');
    expect(result.retryCount).toBe(0);
    expect(result.tokenUsage).toBeDefined();
  });
});
