import { describe, it, expect } from 'vitest';
import {
  chunkDocument,
  splitTextIntoSentenceChunks,
  sortNodesTopologically,
  replaceVariables,
  readNumericField,
  NUMERIC_CONDITIONS,
  resolveTransliterationLanguage,
  resolveNodeFile,
  resolveNodeInput,
} from './execution';
import type { SerializedEdge, SerializedNode } from '@/types/pipeline';

const node = (id: string): SerializedNode => ({
  id,
  type: 'llm',
  label: id,
  positionX: 0,
  positionY: 0,
  config: {},
});

const edge = (source: string, target: string): SerializedEdge => ({
  id: `${source}->${target}`,
  source,
  target,
});

describe('chunkDocument', () => {
  it('returns nothing for empty input', () => {
    expect(chunkDocument('', 100, 10)).toEqual([]);
    expect(chunkDocument('   ', 100, 10)).toEqual([]);
  });

  it('keeps a short document as a single chunk', () => {
    expect(chunkDocument('One short sentence.', 500, 50)).toEqual(['One short sentence.']);
  });

  it('splits a long document into multiple chunks', () => {
    const text = Array.from({ length: 40 }, (_, i) => `Sentence number ${i}.`).join(' ');
    const chunks = chunkDocument(text, 120, 20);
    expect(chunks.length).toBeGreaterThan(1);
  });

  // The reachable bug: the editor's sliders allow overlap (max 500) to exceed
  // chunk size (min 100). That produced a negative step, and the loop's guard
  // broke after pushing one chunk — silently discarding the rest of the file.
  it('does not truncate the document when overlap exceeds chunk size', () => {
    const text = Array.from({ length: 30 }, (_, i) => `Sentence number ${i}.`).join(' ');
    const chunks = chunkDocument(text, 100, 500);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(' ')).toContain('Sentence number 29');
  });

  it('carries content forward between adjacent chunks when overlap is set', () => {
    const text = Array.from({ length: 30 }, (_, i) => `Sentence number ${i}.`).join(' ');
    const withOverlap = chunkDocument(text, 120, 40);
    const withoutOverlap = chunkDocument(text, 120, 0);

    const joinedLength = (c: string[]) => c.join('').length;
    expect(joinedLength(withOverlap)).toBeGreaterThan(joinedLength(withoutOverlap));
  });

  it('splits Devanagari text on the danda rather than mid-word', () => {
    const text = 'यह पहला वाक्य है। यह दूसरा वाक्य है। यह तीसरा वाक्य है। यह चौथा वाक्य है।';
    const chunks = chunkDocument(text, 30, 0);

    expect(chunks.length).toBeGreaterThan(1);
    // Every chunk ends at a sentence boundary, so no chunk ends mid-word.
    for (const chunk of chunks) {
      expect(chunk.trim().endsWith('।')).toBe(true);
    }
  });

  it('never emits an empty chunk', () => {
    const text = Array.from({ length: 25 }, (_, i) => `Line ${i}.`).join(' ');
    for (const chunk of chunkDocument(text, 60, 15)) {
      expect(chunk.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('splitTextIntoSentenceChunks', () => {
  it('treats the Devanagari danda as a sentence terminator', () => {
    const chunks = splitTextIntoSentenceChunks('पहला वाक्य। दूसरा वाक्य। तीसरा वाक्य।', 20);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('hard-splits a single sentence longer than the limit', () => {
    const chunks = splitTextIntoSentenceChunks('a'.repeat(250), 100);
    expect(chunks.length).toBe(3);
    expect(chunks.every((c) => c.length <= 100)).toBe(true);
  });
});

describe('sortNodesTopologically', () => {
  it('orders every node after its dependencies', () => {
    const nodes = [node('c'), node('a'), node('b')];
    const edges = [edge('a', 'b'), edge('b', 'c')];

    const order = sortNodesTopologically(nodes, edges).map((n) => n.id);
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'));
  });

  it('keeps both arms of a diamond ahead of the node that joins them', () => {
    const nodes = [node('start'), node('left'), node('right'), node('join')];
    const edges = [
      edge('start', 'left'),
      edge('start', 'right'),
      edge('left', 'join'),
      edge('right', 'join'),
    ];

    const order = sortNodesTopologically(nodes, edges).map((n) => n.id);
    expect(order.indexOf('left')).toBeLessThan(order.indexOf('join'));
    expect(order.indexOf('right')).toBeLessThan(order.indexOf('join'));
  });

  it('returns disconnected nodes rather than dropping them', () => {
    const nodes = [node('a'), node('b'), node('lonely')];
    const order = sortNodesTopologically(nodes, [edge('a', 'b')]).map((n) => n.id);
    expect(order).toHaveLength(3);
    expect(order).toContain('lonely');
  });

  it('still returns every node when the graph contains a cycle', () => {
    const nodes = [node('a'), node('b')];
    const edges = [edge('a', 'b'), edge('b', 'a')];
    expect(sortNodesTopologically(nodes, edges)).toHaveLength(2);
  });
});

describe('resolveNodeFile', () => {
  it('prefers a file passed down an edge', () => {
    expect(resolveNodeFile({ data: 'from-edge' }, { file_data: { data: 'from-config' } })).toBe('from-edge');
  });

  it('falls back to a file attached in the editor', () => {
    expect(resolveNodeFile(null, { file_data: { data: 'from-config' } })).toBe('from-config');
  });

  it.each([
    ['payload.file', { file: 'a' }, undefined, 'a'],
    ['config.file', null, { file: 'b' }, 'b'],
    ['config.file_url', null, { file_url: 'c' }, 'c'],
    ['config.file_data.url', null, { file_data: { url: 'd' } }, 'd'],
  ])('resolves a file from %s', (_label, payload, config, expected) => {
    expect(resolveNodeFile(payload, config)).toBe(expected);
  });

  // The OCR and Vision nodes throw on null, which is what turns "no file" into
  // a clear error instead of a confident answer about a document nobody read.
  it('returns null when no file is present anywhere', () => {
    expect(resolveNodeFile(null, undefined)).toBeNull();
    expect(resolveNodeFile({}, {})).toBeNull();
    expect(resolveNodeFile({ text: 'just text' }, { language: 'hi-IN' })).toBeNull();
  });
});

describe('resolveNodeInput', () => {
  const n = (id: string) => node(id);

  it('gives an entry node the run input', () => {
    const r = resolveNodeInput(n('a'), [], {}, 'seed text');
    expect(r.upstreamInputText).toBe('seed text');
    expect(r.dynamicInputPayload).toBeNull();
  });

  it('prefers an explicit run-dialog input for an entry node', () => {
    const r = resolveNodeInput(n('a'), [], {}, 'seed text', { a: 'typed by the user' });
    expect(r.upstreamInputText).toBe('typed by the user');
  });

  it('passes a non-string run input through as a payload', () => {
    const file = { data: 'base64', name: 'a.pdf' };
    const r = resolveNodeInput(n('a'), [], {}, 'seed', { a: file });
    expect(r.dynamicInputPayload).toEqual(file);
  });

  it.each([
    ['a plain string', 'hello', 'hello'],
    ['response', { response: 'generated' }, 'generated'],
    ['translated_text', { translated_text: 'अनुवाद' }, 'अनुवाद'],
    ['transcript', { transcript: 'heard' }, 'heard'],
    ['text', { text: 'plain' }, 'plain'],
  ])('reads the upstream output shape %s', (_label, output, expected) => {
    const r = resolveNodeInput(n('b'), [edge('a', 'b')], { a: output }, 'seed');
    expect(r.upstreamInputText).toBe(expected);
  });

  it('describes audio output rather than passing binary downstream', () => {
    const r = resolveNodeInput(n('b'), [edge('a', 'b')], { a: { audios: ['<base64>'] } }, 'seed');
    expect(r.upstreamInputText).toBe('Audio Generated Successfully');
  });

  it('falls back to the run input when the upstream node produced nothing', () => {
    const r = resolveNodeInput(n('b'), [edge('a', 'b')], {}, 'seed');
    expect(r.upstreamInputText).toBe('seed');
  });

  // This is what the pre-execution budget check depends on: the orchestrator
  // must see exactly what the node will see, or it prices the wrong thing.
  it('matches what execution will receive, so a node can be priced first', () => {
    const outputs = { a: { translated_text: 'x'.repeat(1200) } };
    const r = resolveNodeInput(n('b'), [edge('a', 'b')], outputs, 'seed');
    expect(r.upstreamInputText).toHaveLength(1200);
    expect(r.dynamicInputPayload).toBe(outputs.a);
  });
});

describe('resolveTransliterationLanguage', () => {
  it('uses an explicit language code', () => {
    expect(resolveTransliterationLanguage('te-IN', undefined, 'hi-IN')).toBe('te-IN');
  });

  // Pipelines saved before the node called the real endpoint stored script
  // names. They must keep running rather than silently reverting to a default.
  it.each([
    ['Devanagari', 'hi-IN'],
    ['Latin', 'en-IN'],
    ['Telugu', 'te-IN'],
    ['Tamil', 'ta-IN'],
    ['Gurmukhi', 'pa-IN'],
    ['oriya', 'od-IN'],
  ])('maps the legacy script %s to %s', (script, expected) => {
    expect(resolveTransliterationLanguage(undefined, script, 'hi-IN')).toBe(expected);
  });

  it('is not case sensitive about legacy script names', () => {
    expect(resolveTransliterationLanguage(undefined, '  DEVANAGARI ', 'en-IN')).toBe('hi-IN');
  });

  it('falls back when neither is given', () => {
    expect(resolveTransliterationLanguage(undefined, undefined, 'en-IN')).toBe('en-IN');
  });

  it('falls back for a script name it does not recognise', () => {
    expect(resolveTransliterationLanguage(undefined, 'Cyrillic', 'hi-IN')).toBe('hi-IN');
  });

  // Substituting a supported language for an unsupported one would produce
  // confident, wrong output rather than an error the user can act on.
  it('rejects a language the endpoint does not support', () => {
    expect(() => resolveTransliterationLanguage('as-IN', undefined, 'hi-IN')).toThrow(/does not support/i);
    expect(() => resolveTransliterationLanguage('doi-IN', undefined, 'hi-IN')).toThrow();
  });
});

describe('readNumericField', () => {
  it('reads a number straight off the upstream payload', () => {
    expect(readNumericField({ confidence: 0.96 }, '', 'confidence')).toBe(0.96);
  });

  it('reads a number the model emitted as a JSON string in response', () => {
    const payload = { response: '{"sentiment":"POSITIVE","confidence":0.42}' };
    expect(readNumericField(payload, '', 'confidence')).toBe(0.42);
  });

  it('falls back to parsing the upstream text', () => {
    expect(readNumericField(null, '{"confidence":0.5}', 'confidence')).toBe(0.5);
  });

  it('coerces a numeric string, since models quote their numbers', () => {
    expect(readNumericField({ confidence: '0.75' }, '', 'confidence')).toBe(0.75);
  });

  it('honours a non-default field name', () => {
    expect(readNumericField({ score: 12 }, '', 'score')).toBe(12);
  });

  // Returning null rather than NaN is what lets the router fail closed instead
  // of letting an unanswerable comparison pick a branch.
  it.each([
    ['a missing field', { other: 1 }, ''],
    ['a non-numeric value', { confidence: 'high' }, ''],
    ['prose instead of JSON', null, 'the audio was clear'],
    ['nothing at all', null, ''],
  ])('returns null for %s', (_label, payload, text) => {
    expect(readNumericField(payload, text, 'confidence')).toBeNull();
  });

  it('does not treat an empty string as zero', () => {
    expect(readNumericField({ confidence: '' }, '', 'confidence')).toBeNull();
  });

  it('exposes the numeric condition set the router branches on', () => {
    expect([...NUMERIC_CONDITIONS].sort()).toEqual(['gt', 'gte', 'lt', 'lte']);
  });
});

describe('replaceVariables', () => {
  it('substitutes a node output by id', () => {
    expect(replaceVariables('Answer: {{n1}}', { n1: 'forty-two' })).toBe('Answer: forty-two');
  });

  it('substitutes a named property of a node output', () => {
    expect(
      replaceVariables('Says: {{n1.translated_text}}', { n1: { translated_text: 'नमस्ते' } })
    ).toBe('Says: नमस्ते');
  });

  it('falls back through the known output shapes', () => {
    expect(replaceVariables('{{n1}}', { n1: { transcript: 'heard this' } })).toBe('heard this');
  });

  it('reads run inputs and declared variables', () => {
    expect(replaceVariables('{{topic}}', {}, { variables: { topic: 'monsoon' } })).toBe('monsoon');
  });

  it('leaves an unresolved placeholder untouched rather than emitting undefined', () => {
    expect(replaceVariables('{{missing}}', {})).toBe('{{missing}}');
  });

  it('passes through input that is not a string', () => {
    expect(replaceVariables(undefined as any, {})).toBeUndefined();
  });
});
