import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Integration cover for the chunked transcription path.
 *
 * chunkWav is unit tested on its own, but the thing that actually matters is
 * that executeSarvamSTT issues one upstream request per segment and rejoins the
 * answers in order. Nothing verified that until these.
 */

const ORIGINAL_KEY = process.env.SARVAM_API_KEY;

/** 16kHz mono 16-bit WAV of the requested length. */
function wav(seconds: number): Buffer {
  const sampleRate = 16000;
  const blockAlign = 2;
  const dataSize = Math.floor(seconds * sampleRate) * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * blockAlign, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

function dataUrl(buffer: Buffer, mime = 'audio/wav'): string {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/** Responds to each call with a numbered transcript so ordering is observable. */
function mockSarvam() {
  let call = 0;
  return vi.fn(async () => {
    call += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        request_id: `req_${call}`,
        transcript: `segment ${call}`,
        language_code: 'ta-IN',
        confidence: 0.9,
      }),
    } as unknown as Response;
  });
}

describe('executeSarvamSTT chunking', () => {
  beforeEach(() => {
    process.env.SARVAM_API_KEY = 'test-key-not-mock';
    vi.resetModules();
  });

  afterEach(() => {
    process.env.SARVAM_API_KEY = ORIGINAL_KEY;
    vi.unstubAllGlobals();
  });

  it('sends a clip within the limit as a single request', async () => {
    const fetchMock = mockSarvam();
    vi.stubGlobal('fetch', fetchMock);
    const { executeSarvamSTT } = await import('./sarvam');

    const result = await executeSarvamSTT({ file: dataUrl(wav(25)) } as any);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.transcript).toBe('segment 1');
  });

  it('splits a 95s recording into four requests and joins them in order', async () => {
    const fetchMock = mockSarvam();
    vi.stubGlobal('fetch', fetchMock);
    const { executeSarvamSTT } = await import('./sarvam');

    const result = await executeSarvamSTT({ file: dataUrl(wav(95)) } as any);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.transcript).toBe('segment 1 segment 2 segment 3 segment 4');
  });

  it('sends every segment as a valid standalone WAV within the limit', async () => {
    const sent: Buffer[] = [];
    const fetchMock = vi.fn(async (_url: string, init: any) => {
      const file = init.body.get('file') as Blob;
      sent.push(Buffer.from(await file.arrayBuffer()));
      return {
        ok: true,
        status: 200,
        json: async () => ({ transcript: 'ok' }),
      } as unknown as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    const { executeSarvamSTT } = await import('./sarvam');
    const { parseWav, wavDurationSeconds, isWav } = await import('./audio/wav');

    await executeSarvamSTT({ file: dataUrl(wav(95)) } as any);

    expect(sent).toHaveLength(4);
    for (const chunk of sent) {
      expect(isWav(chunk)).toBe(true);
      expect(wavDurationSeconds(chunk)).toBeLessThanOrEqual(30);
      const info = parseWav(chunk);
      expect(info.sampleRate).toBe(16000);
      expect(info.dataSize % info.blockAlign).toBe(0);
    }
    // No audio is dropped between the segments.
    const total = sent.reduce((sum, c) => sum + wavDurationSeconds(c), 0);
    expect(total).toBeCloseTo(95, 3);
  });

  it('keeps the language and averages confidence across segments', async () => {
    vi.stubGlobal('fetch', mockSarvam());
    const { executeSarvamSTT } = await import('./sarvam');

    const result = await executeSarvamSTT({
      file: dataUrl(wav(70)),
      language_code: 'ta-IN',
    } as any);

    expect(result.language_code).toBe('ta-IN');
    expect(result.confidence).toBeCloseTo(0.9, 5);
  });

  it('drops empty segments rather than padding the transcript with gaps', async () => {
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        call += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({ transcript: call === 2 ? '   ' : `part ${call}` }),
        } as unknown as Response;
      })
    );
    const { executeSarvamSTT } = await import('./sarvam');

    const result = await executeSarvamSTT({ file: dataUrl(wav(70)) } as any);
    expect(result.transcript).toBe('part 1 part 3');
  });

  // Formats that cannot be cut still reach Sarvam whole. The raw vendor JSON
  // told the user nothing, which is the failure that started this work.
  it('turns the vendor duration error into something actionable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        text: async () =>
          '{"error":{"message":"Audio duration exceeds the maximum limit of 30 seconds."}}',
      })) as unknown as typeof fetch
    );
    const { executeSarvamSTT } = await import('./sarvam');

    // Must exceed 100 bytes: below that executeSarvamSTT substitutes a silent
    // WAV, which would make this pass without ever exercising the webm path.
    const webm = Buffer.alloc(4096, 0x1a);
    await expect(
      executeSarvamSTT({ file: dataUrl(webm, 'audio/webm') } as any)
    ).rejects.toThrow(/cannot be split automatically \(webm\)/i);
  });

  it('passes other provider errors through unchanged', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 402,
        text: async () => 'insufficient credits',
      })) as unknown as typeof fetch
    );
    const { executeSarvamSTT } = await import('./sarvam');

    await expect(executeSarvamSTT({ file: dataUrl(wav(10)) } as any)).rejects.toThrow(
      /402/
    );
  });
});
