import { describe, it, expect } from 'vitest';
import { classifyNodeError, nodeTypeLabel } from './nodeErrors';

describe('nodeTypeLabel', () => {
  it('names known node types the way the UI does', () => {
    expect(nodeTypeLabel('stt')).toBe('Speech-to-Text');
    expect(nodeTypeLabel('codemix_normalizer')).toBe('Code-Mix Cleaner');
  });

  it('falls back to a readable form for anything unmapped', () => {
    expect(nodeTypeLabel('some_new_node')).toBe('some new node');
  });
});

describe('classifyNodeError', () => {
  it('always produces a title, a summary and at least one next step', () => {
    const samples = [
      'Sarvam STT Error (400): {"error":{"message":"Audio duration exceeds the maximum limit of 30 seconds."}}',
      'Sarvam STT Error (402): insufficient credits',
      'Sarvam TTS Error (401): unauthorized',
      'Sarvam Translate Error (429): rate limit exceeded',
      'Sarvam LLM Error (503): service unavailable',
      'fetch failed',
      'Request timed out',
      'NoSuchKey: the specified key does not exist',
      'something nobody has seen before',
      '',
    ];
    for (const sample of samples) {
      const failure = classifyNodeError(sample, 'stt');
      expect(failure.title).toBeTruthy();
      expect(failure.summary).toBeTruthy();
      expect(failure.remediation.length).toBeGreaterThan(0);
      expect(failure.technical).toBeTruthy();
    }
  });

  // The failure that started this: the raw vendor JSON told the user nothing
  // about the 30-second limit or how to get around it.
  it('explains the 30-second transcription limit', () => {
    const failure = classifyNodeError(
      'Sarvam STT Error (400): {"error":{"message":"Audio duration exceeds the maximum limit of 30 seconds. Please use the batch API for longer audio files."}}',
      'stt'
    );
    expect(failure.code).toBe('audio_too_long');
    expect(failure.isProviderIssue).toBe(false);
    expect(failure.remediation.join(' ')).toMatch(/re-record|wav/i);
  });

  it('reads our own long-audio message too, not just the vendor one', () => {
    const failure = classifyNodeError(
      'This audio is longer than 30 seconds and is in a format that cannot be split automatically (webm).',
      'stt'
    );
    expect(failure.code).toBe('audio_too_long');
  });

  it.each([
    ['Sarvam STT Error (402): payment required', 'provider_credits'],
    ['Sarvam API insufficient credits', 'provider_credits'],
    ['Sarvam TTS Error (401): unauthorized', 'provider_auth'],
    ['Sarvam TTS Error (403): forbidden', 'provider_auth'],
    ['Sarvam Translate Error (429): too many requests', 'provider_rate_limited'],
    ['Sarvam LLM Error (500): internal error', 'provider_unavailable'],
    ['Sarvam LLM Error (503): service unavailable', 'provider_unavailable'],
  ])('classifies %s as %s', (message, expected) => {
    expect(classifyNodeError(message, 'stt').code).toBe(expected);
  });

  it('marks provider-side problems so the UI does not blame the user', () => {
    for (const message of [
      'Sarvam STT Error (402): insufficient credits',
      'Sarvam TTS Error (401): unauthorized',
      'Sarvam LLM Error (503): unavailable',
    ]) {
      expect(classifyNodeError(message, 'stt').isProviderIssue).toBe(true);
    }
  });

  it('does not blame the provider for input the user controls', () => {
    for (const message of [
      'Sarvam STT audio size 62.10MB exceeds limit of 50MB',
      'Sarvam Translate input text length 9000 exceeds limit of 5000 characters',
    ]) {
      expect(classifyNodeError(message, 'translate').isProviderIssue).toBe(false);
    }
  });

  it('separates the size limit from the character limit', () => {
    expect(
      classifyNodeError('Sarvam STT audio size 62.10MB exceeds limit of 50MB', 'stt').code
    ).toBe('audio_too_large');
    expect(
      classifyNodeError(
        'Sarvam Translate input text length 9000 exceeds limit of 5000 characters',
        'translate'
      ).code
    ).toBe('text_too_long');
  });

  // A 402 body mentions a status and the word "credits"; the credit reading is
  // the one that tells the user what to actually do.
  it('prefers the credit reading over the generic 400 reading', () => {
    expect(
      classifyNodeError('Sarvam Error (402): insufficient credits, invalid', 'tts').code
    ).toBe('provider_credits');
  });

  it('does not mistake a run budget message for provider credits', () => {
    const failure = classifyNodeError(
      'Run budget exhausted — this node needs 0.50 credit',
      'llm'
    );
    expect(failure.code).not.toBe('provider_credits');
  });

  it('treats an unmatched 400 as a node configuration problem', () => {
    const failure = classifyNodeError(
      'Sarvam TTS Error (400): speaker not supported for this language',
      'tts'
    );
    expect(failure.code).toBe('node_misconfigured');
    expect(failure.title).toContain('Text-to-Speech');
  });

  it.each([
    ['fetch failed', 'network'],
    ['connect ECONNREFUSED 127.0.0.1:443', 'network'],
    ['Request timed out after 30000ms', 'timeout'],
    ['NoSuchKey: key missing from bucket', 'storage_unavailable'],
  ])('classifies %s as %s', (message, expected) => {
    expect(classifyNodeError(message, 'stt').code).toBe(expected);
  });

  it('names the node type in the fallback so the dialog is still specific', () => {
    const failure = classifyNodeError('total mystery', 'transliteration');
    expect(failure.code).toBe('unknown');
    expect(failure.title).toContain('Transliteration');
    expect(failure.technical).toBe('total mystery');
  });

  it.each([[null], [undefined], [''], ['   '], [{}]])(
    'still returns a usable failure for %s',
    (input) => {
      const failure = classifyNodeError(input, 'llm');
      expect(failure.technical).toBe('Node execution failed');
      expect(failure.remediation.length).toBeGreaterThan(0);
    }
  );

  it('accepts an Error instance as well as a string', () => {
    expect(classifyNodeError(new Error('fetch failed'), 'stt').code).toBe('network');
  });
});
