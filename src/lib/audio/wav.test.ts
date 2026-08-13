import { describe, it, expect } from 'vitest';
import {
  isWav,
  parseWav,
  wavDurationSeconds,
  chunkWav,
  WavParseError,
} from './wav';

/** Build a WAV whose payload is `seconds` long, optionally with extra chunks before `data`. */
function makeWav(
  seconds: number,
  opts: {
    sampleRate?: number;
    channels?: number;
    bitsPerSample?: number;
    audioFormat?: number;
    /** Extra chunk inserted between fmt and data, as [id, bodyLength]. */
    padding?: [string, number];
    /** Override the declared data size, to mimic streamed writers. */
    declaredDataSize?: number;
  } = {}
): Buffer {
  const {
    sampleRate = 16000,
    channels = 1,
    bitsPerSample = 16,
    audioFormat = 1,
    padding,
    declaredDataSize,
  } = opts;

  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = Math.floor(seconds * sampleRate) * blockAlign;

  const pad = padding
    ? (() => {
        const [id, len] = padding;
        const b = Buffer.alloc(8 + len);
        b.write(id, 0);
        b.writeUInt32LE(len, 4);
        return b;
      })()
    : Buffer.alloc(0);

  const header = Buffer.alloc(36);
  header.write('RIFF', 0);
  header.writeUInt32LE(28 + pad.length + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(audioFormat, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  const dataHeader = Buffer.alloc(8);
  dataHeader.write('data', 0);
  dataHeader.writeUInt32LE(declaredDataSize ?? dataSize, 4);

  // Fill with a recognisable ramp so slices can be checked for continuity.
  const body = Buffer.alloc(dataSize);
  for (let i = 0; i < dataSize; i++) body[i] = i % 251;

  return Buffer.concat([header, pad, dataHeader, body]);
}

describe('isWav', () => {
  it('accepts a RIFF/WAVE buffer', () => {
    expect(isWav(makeWav(1))).toBe(true);
  });

  it('rejects other data without throwing', () => {
    expect(isWav(Buffer.from('this is not audio'))).toBe(false);
    expect(isWav(Buffer.alloc(4))).toBe(false);
  });
});

describe('parseWav', () => {
  it('reads the format and locates the payload', () => {
    const info = parseWav(makeWav(2));
    expect(info).toMatchObject({
      audioFormat: 1,
      channels: 1,
      sampleRate: 16000,
      bitsPerSample: 16,
      blockAlign: 2,
    });
    expect(info.dataSize).toBe(2 * 16000 * 2);
  });

  it('finds the data chunk when other chunks sit in front of it', () => {
    const info = parseWav(makeWav(1, { padding: ['LIST', 26] }));
    // The ramp restarts at the payload, so a misread offset shows up here.
    expect(info.dataSize).toBe(16000 * 2);
    expect(info.sampleRate).toBe(16000);
  });

  it('falls back to the buffer length when the size is left unwritten', () => {
    for (const declared of [0, 0xffffffff]) {
      const info = parseWav(makeWav(1, { declaredDataSize: declared }));
      expect(info.dataSize).toBe(16000 * 2);
    }
  });

  it('never reports more payload than the buffer holds', () => {
    const truncated = makeWav(2).subarray(0, 44 + 1000);
    expect(parseWav(truncated).dataSize).toBe(1000);
  });

  it('rejects non-WAV input', () => {
    expect(() => parseWav(Buffer.from('nope'))).toThrow(WavParseError);
  });

  it('rejects compressed WAV, which cannot be cut on a byte boundary', () => {
    expect(() => parseWav(makeWav(1, { audioFormat: 17 }))).toThrow(/cannot be split/i);
  });
});

describe('wavDurationSeconds', () => {
  it('measures mono and stereo alike', () => {
    expect(wavDurationSeconds(makeWav(3))).toBeCloseTo(3, 5);
    expect(wavDurationSeconds(makeWav(3, { channels: 2 }))).toBeCloseTo(3, 5);
    expect(wavDurationSeconds(makeWav(3, { sampleRate: 44100 }))).toBeCloseTo(3, 5);
  });
});

describe('chunkWav', () => {
  it('returns the original buffer untouched when it already fits', () => {
    const wav = makeWav(12);
    const chunks = chunkWav(wav, 30);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(wav);
  });

  it('splits a long file into pieces that each fit the limit', () => {
    const chunks = chunkWav(makeWav(95), 30);
    expect(chunks).toHaveLength(4);
    for (const chunk of chunks) {
      expect(isWav(chunk)).toBe(true);
      expect(wavDurationSeconds(chunk)).toBeLessThanOrEqual(30);
    }
    expect(wavDurationSeconds(chunks[3])).toBeCloseTo(5, 5);
  });

  it('preserves every sample byte across the split', () => {
    const wav = makeWav(70);
    const original = wav.subarray(parseWav(wav).dataOffset);
    const rejoined = Buffer.concat(
      chunkWav(wav, 30).map((c) => c.subarray(parseWav(c).dataOffset))
    );
    expect(rejoined.equals(original)).toBe(true);
  });

  it('carries the source format onto every chunk', () => {
    const chunks = chunkWav(makeWav(70, { sampleRate: 44100, channels: 2 }), 30);
    for (const chunk of chunks) {
      expect(parseWav(chunk)).toMatchObject({
        sampleRate: 44100,
        channels: 2,
        blockAlign: 4,
      });
    }
  });

  it('cuts only on frame boundaries', () => {
    // 44100Hz stereo 16-bit has a 4-byte frame, and 30s is not a whole number
    // of bytes at every rate — a mid-frame cut would offset all later samples.
    for (const chunk of chunkWav(makeWav(70, { sampleRate: 44100, channels: 2 }), 30)) {
      const info = parseWav(chunk);
      expect(info.dataSize % info.blockAlign).toBe(0);
    }
  });

  it('refuses a non-positive limit', () => {
    expect(() => chunkWav(makeWav(5), 0)).toThrow(RangeError);
  });
});
