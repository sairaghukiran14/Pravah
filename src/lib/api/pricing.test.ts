import { describe, it, expect } from 'vitest';
import {
  billableText,
  billableAudioSeconds,
  billablePages,
  sttSegments,
  nodeCost,
} from './pricing';

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

describe('billableAudioSeconds', () => {
  it('reads the duration off an upstream audio payload', () => {
    expect(billableAudioSeconds({ payload: { durationSeconds: 95 } })).toBe(95);
  });

  it('reads the duration off a bare input', () => {
    expect(billableAudioSeconds({ durationSeconds: 12 })).toBe(12);
  });

  it.each([
    [null],
    [undefined],
    [{}],
    [{ payload: null }],
    [{ payload: { durationSeconds: null } }],
    [{ payload: { durationSeconds: 'abc' } }],
    [{ payload: { durationSeconds: -5 } }],
    [{ payload: { durationSeconds: Infinity } }],
  ])('returns 0 for %s rather than throwing', (input) => {
    expect(billableAudioSeconds(input)).toBe(0);
  });
});

describe('billablePages', () => {
  it('reads the page count off an upstream document payload', () => {
    expect(billablePages({ payload: { pageCount: 12 } })).toBe(12);
  });

  it('rounds a fractional count up rather than losing the page', () => {
    expect(billablePages({ payload: { pageCount: 3.2 } })).toBe(4);
  });

  it.each([
    [null],
    [undefined],
    [{}],
    [{ payload: null }],
    [{ payload: { pageCount: 0 } }],
    [{ payload: { pageCount: -3 } }],
    [{ payload: { pageCount: 'many' } }],
  ])('falls back to a single page for %s', (input) => {
    expect(billablePages(input)).toBe(1);
  });
});

describe('sttSegments', () => {
  it.each([
    [1, 1],
    [30, 1],
    [30.5, 2],
    [60, 2],
    [95, 4],
    [600, 20],
  ])('bills %ss of audio as %i segment(s)', (seconds, expected) => {
    expect(sttSegments({ payload: { durationSeconds: seconds } })).toBe(expected);
  });

  it('bills audio of unknown length as a single segment', () => {
    expect(sttSegments({ text: '' })).toBe(1);
  });
});

describe('nodeCost', () => {
  it('charges the baseline for a clip within one segment', () => {
    expect(nodeCost('stt', { text: '' })).toBe(0.375);
    expect(nodeCost('stt', { payload: { durationSeconds: 25 } })).toBe(0.375);
  });

  // The regression this guards: Sarvam's sync endpoint caps at 30s, so a long
  // recording costs one API call per segment. Billing it as a single flat
  // 0.375 meant a 10-minute file made 20 upstream calls and charged for one.
  it('charges speech-to-text per 30s segment of audio', () => {
    expect(nodeCost('stt', { payload: { durationSeconds: 95 } })).toBeCloseTo(1.5, 10);
    expect(nodeCost('stt', { payload: { durationSeconds: 600 } })).toBeCloseTo(7.5, 10);
  });

  it('never charges less than the baseline, whatever the duration says', () => {
    for (const durationSeconds of [0, -1, null, undefined]) {
      expect(nodeCost('stt', { payload: { durationSeconds } })).toBe(0.375);
    }
  });

  it('charges translate per character of the text it processed', () => {
    expect(nodeCost('translate', { text: 'a'.repeat(1000) })).toBeCloseTo(3.0, 10);
  });

  it('charges tts per character of the text it processed', () => {
    expect(nodeCost('tts', { text: 'a'.repeat(1000) })).toBeCloseTo(4.5, 10);
  });

  // Every rate is set at 1.5x what Sarvam bills. TTS was the one exception, at
  // 2.25 against a 3.00 cost — half what the rule gives, and a loss on every
  // call. These three lock the ratio in place.
  it.each([
    ['stt', 0.375, 0.25],
    ['translate', 3.0, 2.0],
    ['tts', 4.5, 3.0],
  ])('prices %s at 1.5x the provider rate', (_type, charged, providerCost) => {
    expect(charged / providerCost).toBeCloseTo(1.5, 10);
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

  // The regression this guards: Sarvam bills digitisation per page, so a flat
  // per-node fee meant a 10-page PDF cost 5.00 to serve and earned 0.50.
  describe('ocr', () => {
    it('charges per page of the document it was given', () => {
      expect(nodeCost('ocr', { payload: { pageCount: 1 } })).toBeCloseTo(0.75, 10);
      expect(nodeCost('ocr', { payload: { pageCount: 10 } })).toBeCloseTo(7.5, 10);
      expect(nodeCost('ocr', { payload: { pageCount: 40 } })).toBeCloseTo(30, 10);
    });

    it('stays above the provider cost at every page count', () => {
      for (const pageCount of [1, 3, 10, 40, 437]) {
        const charged = nodeCost('ocr', { payload: { pageCount } });
        expect(charged).toBeGreaterThan(pageCount * 0.5); // Sarvam: 0.50/page
      }
    });

    it('bills a single page when the count is unknown', () => {
      expect(nodeCost('ocr', { text: '' })).toBeCloseTo(0.75, 10);
    });
  });

  // The podcast node makes one text-to-speech call per dialogue turn, so a
  // flat fee lost money on any script longer than a few lines.
  describe('podcast', () => {
    it('charges for the speech it actually generated', () => {
      const cost = nodeCost('podcast', { text: '' }, { usage: { speechChars: 2000 } });
      expect(cost).toBeCloseTo(0.5 + 9.0, 10);
    });

    it('covers the provider cost of the speech it produced', () => {
      for (const speechChars of [200, 1000, 2000, 5000]) {
        const charged = nodeCost('podcast', { text: '' }, { usage: { speechChars } });
        expect(charged).toBeGreaterThan(speechChars * 0.003); // Sarvam TTS rate
      }
    });

    // The projection holds the credit before the script exists. If it came in
    // under the settlement, the node would spend more than was reserved for it.
    it('projects at least what it later settles for', () => {
      for (const turns of [1, 4, 8, 20]) {
        const projected = nodeCost('podcast', { text: '' }, { config: { turns } });
        // The prompt caps a turn at one or two sentences; 160 chars is a long one.
        const realistic = nodeCost(
          'podcast',
          { text: '' },
          { usage: { speechChars: turns * 160 } }
        );
        expect(projected).toBeGreaterThanOrEqual(realistic);
      }
    });

    it('projects from the default turn count when none is configured', () => {
      expect(nodeCost('podcast', { text: '' })).toBeCloseTo(0.5 + 4 * 200 * 0.0045, 10);
    });
  });

  // A short classification call, not a 105B inference — pricing it the same
  // would discourage using detection to route, which is the point of it.
  it('charges less for language detection than for a model node', () => {
    const detect = nodeCost('language_detect', { text: 'anything' });
    expect(detect).toBeGreaterThan(0);
    expect(detect).toBeLessThan(nodeCost('llm', { text: 'anything' }));
  });
});
