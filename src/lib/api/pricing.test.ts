import { describe, it, expect } from 'vitest';
import { billableText, nodeCost } from './pricing';

describe('billableText', () => {
  it('reads the text of an entry node', () => {
    expect(billableText({ text: 'hello' })).toBe('hello');
  });

  it('reads a string payload from an upstream node', () => {
    expect(billableText({ payload: 'from upstream' })).toBe('from upstream');
  });

  it.each([
    ['translated_text', { translated_text: 'अनुवाद' }, 'अनुवाद'],
    ['transcript', { transcript: 'transcribed' }, 'transcribed'],
    ['response', { response: 'generated' }, 'generated'],
    ['text', { text: 'plain' }, 'plain'],
  ])('reads %s off an upstream payload object', (_label, payload, expected) => {
    expect(billableText({ payload })).toBe(expected);
  });

  it('prefers translated_text over the other payload fields', () => {
    expect(
      billableText({ payload: { translated_text: 'first', transcript: 'second', text: 'third' } })
    ).toBe('first');
  });

  it.each([[null], [undefined], [{}], [{ payload: null }], [{ payload: 42 }]])(
    'returns an empty string for %s rather than throwing',
    (input) => {
      expect(billableText(input)).toBe('');
    }
  );
});

describe('nodeCost', () => {
  it('charges a flat baseline for speech-to-text', () => {
    expect(nodeCost('stt', { text: '' })).toBe(0.375);
  });

  it('charges translate per character of the text it processed', () => {
    expect(nodeCost('translate', { text: 'a'.repeat(1000) })).toBeCloseTo(3.0, 10);
  });

  it('charges tts per character of the text it processed', () => {
    expect(nodeCost('tts', { text: 'a'.repeat(1000) })).toBeCloseTo(2.25, 10);
  });

  // The regression this guards: metered nodes read their input from `payload`
  // whenever they have an incoming edge, which is the normal case. Reading only
  // `.text` billed every one of them as zero.
  it('meters a node fed by an upstream edge, not just an entry node', () => {
    const cost = nodeCost('translate', { payload: { transcript: 'x'.repeat(500) } });
    expect(cost).toBeCloseTo(1.5, 10);
    expect(cost).toBeGreaterThan(0);
  });

  it.each(['audio_input', 'audio_output', 'text_input', 'text_output'])(
    'does not charge for the %s passthrough node',
    (type) => {
      expect(nodeCost(type, { text: 'anything' })).toBe(0);
    }
  );

  it.each(['llm', 'summarize', 'vision', 'router', 'vector_search'])(
    'charges the flat rate for %s',
    (type) => {
      expect(nodeCost(type, { text: 'anything' })).toBe(0.5);
    }
  );
});
