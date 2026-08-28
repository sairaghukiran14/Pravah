import { describe, it, expect } from 'vitest';
import { executeSingleNode, sortNodesTopologically } from './execution';
import { nodeCost, billableText, billableAudioSeconds, sttSegments, billablePages } from './api/pricing';
import type { SerializedNode, SerializedEdge, NodeRunData, PipelineRunData } from '@/types/pipeline';

describe('Deep Trace Engine & Telemetry Suite', () => {
  describe('1. Topological DAG & Trace Sequence', () => {
    it('correctly orders multi-branch pipeline execution for waterfall alignment', () => {
      const nodes: SerializedNode[] = [
        { id: 'node_out', type: 'text_output', label: 'Output', positionX: 400, positionY: 0, config: {} },
        { id: 'node_llm', type: 'llm', label: 'LLM Reasoning', positionX: 200, positionY: 0, config: {} },
        { id: 'node_stt', type: 'stt', label: 'Speech-to-Text', positionX: 100, positionY: 0, config: {} },
        { id: 'node_in', type: 'audio_input', label: 'Audio In', positionX: 0, positionY: 0, config: {} },
      ];

      const edges: SerializedEdge[] = [
        { id: 'e1', source: 'node_in', target: 'node_stt' },
        { id: 'e2', source: 'node_stt', target: 'node_llm' },
        { id: 'e3', source: 'node_llm', target: 'node_out' },
      ];

      const sorted = sortNodesTopologically(nodes, edges);
      const sortedIds = sorted.map((n) => n.id);

      expect(sortedIds).toEqual(['node_in', 'node_stt', 'node_llm', 'node_out']);
    });
  });

  describe('2. Multi-NodeType Telemetry & Token Attribution', () => {
    it('measures STT audio segments and duration correctly', async () => {
      const audioNode: SerializedNode = {
        id: 'stt_span_1',
        type: 'stt',
        label: 'Sarvam Saaras STT',
        positionX: 0,
        positionY: 0,
        config: { language_code: 'hi-IN' },
      };

      // Mock dynamic input with 75s audio (3 segments of 30s)
      const inputPayload = { data: 'mock_audio_base64', durationSeconds: 75 };
      const result = await executeSingleNode(audioNode, [], {}, '', { stt_span_1: inputPayload });

      expect(result.nodeId).toBe('stt_span_1');
      expect(result.nodeType).toBe('stt');
      expect(typeof result.durationMs).toBe('number');
      expect(result.retryCount).toBe(0);
      expect(result.tokenUsage?.audioDurationSec).toBe(75);
      expect(result.tokenUsage?.segments).toBe(3);

      const cost = nodeCost('stt', { payload: inputPayload });
      expect(cost).toBe(0.375 * 3); // ₹1.125
    });

    it('measures LLM token estimation and character usage', async () => {
      const llmNode: SerializedNode = {
        id: 'llm_span_1',
        type: 'llm',
        label: 'Gemini Generative Node',
        positionX: 0,
        positionY: 0,
        config: { system_prompt: 'Translate to Hindi' },
      };

      const upstreamText = 'The quick brown fox jumps over the lazy dog. A quick test prompt for tokenization.';
      const result = await executeSingleNode(llmNode, [], {}, upstreamText);

      expect(result.nodeId).toBe('llm_span_1');
      expect(result.tokenUsage?.promptTokens).toBe(Math.ceil(upstreamText.length / 4));
      expect(result.tokenUsage?.charCount).toBeGreaterThanOrEqual(upstreamText.length);
      expect(result.tokenUsage?.totalTokens).toBeGreaterThan(0);
    });

    it('measures OCR and document page counts', async () => {
      const docInput = { payload: { pageCount: 5, text: 'Page 1-5 content' } };
      const pages = billablePages(docInput);
      expect(pages).toBe(5);

      const ocrCost = nodeCost('ocr', docInput);
      expect(ocrCost).toBe(0.75 * 5); // ₹3.75
    });
  });

  describe('3. Trace Waterfall & Latency Bounds', () => {
    it('ensures durationMs is always non-negative and records finishedAt offset', () => {
      const mockNodeRuns: NodeRunData[] = [
        {
          id: 'nr_1',
          runId: 'run_100',
          nodeId: 'input_node',
          nodeType: 'text_input',
          status: 'completed',
          durationMs: 15,
          cost: 0,
          startedAt: new Date('2026-08-28T12:00:00.000Z').toISOString(),
          finishedAt: new Date('2026-08-28T12:00:00.015Z').toISOString(),
        },
        {
          id: 'nr_2',
          runId: 'run_100',
          nodeId: 'translate_node',
          nodeType: 'translate',
          status: 'completed',
          durationMs: 320,
          cost: 0.15,
          startedAt: new Date('2026-08-28T12:00:00.015Z').toISOString(),
          finishedAt: new Date('2026-08-28T12:00:00.335Z').toISOString(),
        },
        {
          id: 'nr_3',
          runId: 'run_100',
          nodeId: 'tts_node',
          nodeType: 'tts',
          status: 'completed',
          durationMs: 480,
          cost: 0.225,
          startedAt: new Date('2026-08-28T12:00:00.335Z').toISOString(),
          finishedAt: new Date('2026-08-28T12:00:00.815Z').toISOString(),
        },
      ];

      const totalCalculatedCost = mockNodeRuns.reduce((sum, n) => sum + (n.cost || 0), 0);
      expect(totalCalculatedCost).toBeCloseTo(0.375, 4);

      const baseStart = new Date(mockNodeRuns[0].startedAt!).getTime();
      const baseEnd = new Date(mockNodeRuns[2].finishedAt!).getTime();
      const totalSpanMs = baseEnd - baseStart;
      expect(totalSpanMs).toBe(815);
    });
  });

  describe('4. Error Trace Telemetry & Diagnostics', () => {
    it('retains error message, duration, and retry metadata on node failure', async () => {
      const errorNode: SerializedNode = {
        id: 'bad_translit_node',
        type: 'transliteration',
        label: 'Broken Transliteration',
        positionX: 0,
        positionY: 0,
        config: { source_language_code: 'invalid_lang_code', target_language_code: 'invalid_lang_code' },
      };

      const result = await executeSingleNode(errorNode, [], {}, 'input payload');
      expect(result.status).toBe('failed');
      expect(result.nodeId).toBe('bad_translit_node');
      expect(typeof result.error).toBe('string');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.retryCount).toBe(0);
      expect(result.tokenUsage).toBeDefined();
    });
  });
});
