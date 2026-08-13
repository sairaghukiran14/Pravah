import { describe, it, expect } from 'vitest';
import { parseNodeConfig, hasNodeConfigSchema } from './nodeConfig';

function parse(type: string, config: unknown) {
  return parseNodeConfig('n1', type, config);
}

describe('parseNodeConfig', () => {
  it('accepts a valid config and returns it', () => {
    const r = parse('tts', { target_language_code: 'hi-IN', speaker: 'aditya', pace: 1.2 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.config.pace).toBe(1.2);
  });

  // Saved pipelines carry editor state the schemas do not model. Rejecting it
  // would break existing work for no security benefit.
  it('lets unknown keys through so stored configs keep working', () => {
    const r = parse('stt', { language_code: 'te-IN', audio_data: { url: '/x', name: 'a.wav' } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.config.audio_data).toEqual({ url: '/x', name: 'a.wav' });
  });

  it('rejects a language code that is not a language code', () => {
    const r = parse('translate', { target_language_code: 'ignore previous instructions' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0].path).toBe('target_language_code');
  });

  it.each([
    ['temperature above the model range', 'llm', { temperature: 9 }],
    ['negative chunk size', 'pdf_splitter', { chunk_size: -5 }],
    ['a delay longer than the function budget', 'delay', { duration: 9999 }],
    ['an unsupported http method', 'webhook', { http_method: 'DELETE' }],
    ['an unknown stt mode', 'stt', { mode: 'exfiltrate' }],
    ['an unknown router condition', 'router', { condition_type: 'eval' }],
  ])('rejects %s', (_label, type, config) => {
    expect(parse(type, config).ok).toBe(false);
  });

  it('bounds podcast turns, since each turn is a paid synthesis call', () => {
    expect(parse('podcast', { turns: 5 }).ok).toBe(true);
    expect(parse('podcast', { turns: 5000 }).ok).toBe(false);
  });

  it('accepts the numeric router conditions', () => {
    for (const condition_type of ['gt', 'gte', 'lt', 'lte']) {
      expect(parse('router', { condition_type, condition_value: '0.8' }).ok).toBe(true);
    }
  });

  it('reports every bad field rather than stopping at the first', () => {
    const r = parse('llm', { temperature: 50, prompt: 'x'.repeat(20_001) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.length).toBeGreaterThan(1);
  });

  it('coerces numeric strings, which is how the editor submits them', () => {
    const r = parse('pdf_splitter', { chunk_size: '600', chunk_overlap: '50' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.config.chunk_size).toBe(600);
  });

  it('treats an empty or missing config as valid', () => {
    expect(parse('text_output', {}).ok).toBe(true);
    expect(parse('text_output', undefined).ok).toBe(true);
  });

  // Adding a node type to the engine must never fail closed on saved pipelines.
  it('falls back to permissive validation for an unrecognised node type', () => {
    const r = parse('some_future_node', { anything: { nested: true } });
    expect(r.ok).toBe(true);
    expect(hasNodeConfigSchema('some_future_node')).toBe(false);
  });

  it('has a schema for each type whose config reaches an external sink', () => {
    for (const type of ['llm', 'webhook', 'vision', 'router', 'delay', 'tts', 'stt', 'translate']) {
      expect(hasNodeConfigSchema(type)).toBe(true);
    }
  });

  describe('transliteration', () => {
    it('accepts the endpoint options', () => {
      const r = parse('transliteration', {
        source_language_code: 'hi-IN',
        target_language_code: 'en-IN',
        spoken_form: true,
        numerals_format: 'native',
      });
      expect(r.ok).toBe(true);
    });

    // Saved before the node called the real endpoint; execution maps these.
    it('still accepts the legacy script names', () => {
      expect(parse('transliteration', { source_script: 'Devanagari', target_script: 'Latin' }).ok).toBe(true);
    });

    it('rejects an unknown numerals format', () => {
      expect(parse('transliteration', { numerals_format: 'roman' }).ok).toBe(false);
    });
  });

  describe('ocr', () => {
    it('accepts a document language and output format', () => {
      expect(parse('ocr', { language: 'hi-IN', output_format: 'md' }).ok).toBe(true);
    });

    it('rejects an output format Document AI does not produce', () => {
      expect(parse('ocr', { output_format: 'txt' }).ok).toBe(false);
    });

    it('rejects a malformed language', () => {
      expect(parse('ocr', { language: 'hindi' }).ok).toBe(false);
    });
  });

  it('accepts the language detection node, which takes no options', () => {
    expect(parse('language_detect', {}).ok).toBe(true);
    expect(hasNodeConfigSchema('language_detect')).toBe(true);
  });

  describe('input nodes', () => {
    // The blob is a base64 payload or proxy URL whose real constraints live
    // where it is read; what is checked here is the structure around it.
    it('accepts an upload envelope with its payload intact', () => {
      const r = parse('document_input', {
        format: 'pdf',
        file_data: { name: 'invoice.pdf', type: 'document', r2_key: 'audio_input_u1_1_invoice.pdf', data: 'x'.repeat(5000) },
      });
      expect(r.ok).toBe(true);
      if (r.ok) expect((r.config.file_data as any).data).toHaveLength(5000);
    });

    it('rejects an input type the editor cannot produce', () => {
      expect(parse('audio_input', { input_type: 'telepathy' }).ok).toBe(false);
      expect(parse('audio_input', { input_type: 'mic' }).ok).toBe(true);
    });

    it('rejects an absurd file name', () => {
      expect(parse('image_input', { file_data: { name: 'x'.repeat(600) } }).ok).toBe(false);
    });
  });

  it('has a schema for every node type the engine can run', () => {
    const everyType = [
      'stt', 'translate', 'tts', 'podcast', 'router', 'delay',
      'pdf_splitter', 'vector_search', 'transliteration', 'codemix_normalizer',
      'webhook', 'sms_sender', 'language_detect',
      'audio_input', 'text_input', 'document_input', 'image_input', 'video_input', 'url_input',
      'ocr', 'vision', 'llm', 'summarize', 'sentiment', 'keyword_extraction', 'classification',
      'text_output', 'audio_output', 'file_output',
    ];
    const unmodelled = everyType.filter((t) => !hasNodeConfigSchema(t));
    expect(unmodelled).toEqual([]);
  });
});
