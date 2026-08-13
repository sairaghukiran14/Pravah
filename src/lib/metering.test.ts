import { describe, it, expect } from 'vitest';
import { executeSingleNode } from './execution';
import { nodeCost } from './api/pricing';
import type { SerializedEdge, SerializedNode } from '@/types/pipeline';

/**
 * End-to-end cover for billing units.
 *
 * The unit tests prove nodeCost prices a duration or a page count correctly.
 * What they cannot show is that the number ever reaches it: the value is set on
 * an entry node's output, travels an edge, and is read back out of the
 * downstream node's input. A break anywhere along that path silently reverts
 * every long recording to the one-segment minimum, which is exactly the
 * underbilling this work set out to fix.
 */

const node = (
  id: string,
  type: string,
  config: Record<string, any> = {}
): SerializedNode =>
  ({
    id,
    type,
    label: id,
    positionX: 0,
    positionY: 0,
    config,
  }) as SerializedNode;

const edge = (source: string, target: string): SerializedEdge =>
  ({
    id: `${source}->${target}`,
    source,
    target,
    sourceHandle: null,
    targetHandle: null,
  }) as SerializedEdge;

/** A PDF that declares its own page count. */
function pdf(pages: number): string {
  const body =
    `%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count ${pages} >>\nendobj\n%%EOF`;
  return `data:application/pdf;base64,${Buffer.from(body, 'latin1').toString('base64')}`;
}

/** The cost the run route settles a node at, given the result it produced. */
function settledCost(nodeType: string, result: { input: any; usage?: any }, config?: any) {
  return nodeCost(nodeType, result.input, { usage: result.usage, config });
}

describe('audio duration reaches STT pricing', () => {
  it('carries durationSeconds from a run input onto the audio_input output', async () => {
    const audioNode = node('audio1', 'audio_input');
    const result = await executeSingleNode(audioNode, [], {}, '', {
      audio1: { type: 'audio', data: 'https://example.com/a.wav', durationSeconds: 95 },
    });

    expect(result.status).toBe('completed');
    expect(result.output.durationSeconds).toBe(95);
  });

  it.each([
    [25, 0.375],
    [95, 1.5],
    [300, 3.75],
  ])('bills a %ss recording at %i credits downstream', async (seconds, expected) => {
    const audioNode = node('audio1', 'audio_input');
    const sttNode = node('stt1', 'stt');
    const edges = [edge('audio1', 'stt1')];

    const audioResult = await executeSingleNode(audioNode, edges, {}, '', {
      audio1: { type: 'audio', data: 'https://example.com/a.wav', durationSeconds: seconds },
    });

    // resolveNodeInput reads the upstream output the same way the run loop does.
    const sttResult = await executeSingleNode(
      sttNode,
      edges,
      { audio1: audioResult.output },
      ''
    );

    expect(settledCost('stt', sttResult)).toBeCloseTo(expected, 10);
  });

  it('falls back to one segment when the recording has no duration', async () => {
    const audioNode = node('audio1', 'audio_input');
    const sttNode = node('stt1', 'stt');
    const edges = [edge('audio1', 'stt1')];

    const audioResult = await executeSingleNode(audioNode, edges, {}, '', {
      audio1: { type: 'audio', data: 'https://example.com/a.wav' },
    });
    const sttResult = await executeSingleNode(
      sttNode,
      edges,
      { audio1: audioResult.output },
      ''
    );

    expect(settledCost('stt', sttResult)).toBeCloseTo(0.375, 10);
  });
});

describe('page count reaches OCR pricing', () => {
  it('counts the pages of a document supplied in the node config', async () => {
    const docNode = node('doc1', 'document_input', {
      file_data: { data: pdf(10), name: 'report.pdf' },
    });
    const result = await executeSingleNode(docNode, [], {}, '');

    expect(result.output.pageCount).toBe(10);
  });

  it('bills a 10-page document above what the provider charges for it', async () => {
    const docNode = node('doc1', 'document_input', {
      file_data: { data: pdf(10), name: 'report.pdf' },
    });
    const ocrNode = node('ocr1', 'ocr');
    const edges = [edge('doc1', 'ocr1')];

    const docResult = await executeSingleNode(docNode, edges, {}, '');
    const ocrResult = await executeSingleNode(
      ocrNode,
      edges,
      { doc1: docResult.output },
      ''
    );

    const charged = settledCost('ocr', ocrResult);
    expect(charged).toBeCloseTo(7.5, 10);
    expect(charged).toBeGreaterThan(10 * 0.5); // Sarvam digitisation: 0.50/page
  });

  it('does not put a page count on non-document inputs', async () => {
    const imageNode = node('img1', 'image_input', {
      file_data: { data: 'data:image/png;base64,AAAA', name: 'x.png' },
    });
    const result = await executeSingleNode(imageNode, [], {}, '');
    expect(result.output.pageCount).toBeUndefined();
  });
});

describe('the projected cost always covers the settled cost', () => {
  // The run holds a fixed number of credits before executing and charges any
  // overshoot at settlement, so a projection that comes in under the true cost
  // can settle a wallet negative.
  it('holds at least the settlement for a podcast of any configured length', () => {
    for (const turns of [1, 4, 8, 20]) {
      const projected = nodeCost('podcast', { text: '' }, { config: { turns } });
      const settled = nodeCost(
        'podcast',
        { text: '' },
        { usage: { speechChars: turns * 160 }, config: { turns } }
      );
      expect(projected).toBeGreaterThanOrEqual(settled);
    }
  });

  it('prices STT and OCR identically whether projecting or settling', () => {
    // Neither reads usage, so the two calls must agree by construction.
    const sttInput = { payload: { durationSeconds: 95 } };
    expect(nodeCost('stt', sttInput, { config: {} })).toBe(nodeCost('stt', sttInput));

    const ocrInput = { payload: { pageCount: 10 } };
    expect(nodeCost('ocr', ocrInput, { config: {} })).toBe(nodeCost('ocr', ocrInput));
  });
});
