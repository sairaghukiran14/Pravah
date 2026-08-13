/**
 * Minimal WAV reading and splitting.
 *
 * Sarvam's synchronous /speech-to-text endpoint rejects anything longer than 30
 * seconds, so audio past that has to be cut into pieces and transcribed piece
 * by piece. Uncompressed WAV is the only format that can be cut without a
 * decoder — every frame is at a fixed byte offset — which is why audio is
 * normalised to WAV in the browser before it ever reaches the server.
 *
 * Deliberately dependency-free: this runs inside the pipeline execution path on
 * a serverless host, where pulling in ffmpeg is not an option.
 */

/** PCM integer samples. */
const FORMAT_PCM = 1;
/** IEEE float samples — still uncompressed, so still safe to cut on a frame boundary. */
const FORMAT_IEEE_FLOAT = 3;

export interface WavInfo {
  audioFormat: number;
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  /** Bytes per sample frame; a cut is only valid on a multiple of this. */
  blockAlign: number;
  /** Byte offset of the first sample. */
  dataOffset: number;
  /** Byte length of the sample payload. */
  dataSize: number;
}

export class WavParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WavParseError';
  }
}

/** True if the buffer carries a RIFF/WAVE magic number. Does not validate the body. */
export function isWav(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  );
}

/**
 * Read the format and locate the sample payload.
 *
 * Walks the chunk list rather than assuming `fmt ` at 12 and `data` at 36 —
 * recorders and editors routinely emit LIST/fact/JUNK chunks in between, and
 * assuming fixed offsets silently reads metadata as audio.
 */
export function parseWav(buffer: Buffer): WavInfo {
  if (!isWav(buffer)) {
    throw new WavParseError('Not a RIFF/WAVE file');
  }

  let audioFormat = 0;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let blockAlign = 0;
  let dataOffset = -1;
  let dataSize = 0;

  // Chunks start after "RIFF" + size + "WAVE"; each is an id, a size, then the
  // body, padded to an even length.
  let cursor = 12;
  while (cursor + 8 <= buffer.length) {
    const id = buffer.toString('ascii', cursor, cursor + 4);
    const size = buffer.readUInt32LE(cursor + 4);
    const body = cursor + 8;

    if (id === 'fmt ') {
      if (body + 16 > buffer.length) {
        throw new WavParseError('Truncated fmt chunk');
      }
      audioFormat = buffer.readUInt16LE(body);
      channels = buffer.readUInt16LE(body + 2);
      sampleRate = buffer.readUInt32LE(body + 4);
      blockAlign = buffer.readUInt16LE(body + 12);
      bitsPerSample = buffer.readUInt16LE(body + 14);
    } else if (id === 'data') {
      dataOffset = body;
      const remaining = Math.max(0, buffer.length - body);
      // Streamed writers leave this as 0 or 0xFFFFFFFF because the length was
      // not known upfront; in both cases the rest of the buffer is the audio.
      dataSize =
        size === 0 || size === 0xffffffff ? remaining : Math.min(size, remaining);
    }

    const next = body + size + (size % 2);
    // A zero-size chunk leaves the cursor where it started, which would spin
    // here forever on a malformed file.
    if (next <= cursor) break;
    cursor = next;
  }

  if (dataOffset < 0) throw new WavParseError('No data chunk');
  if (!sampleRate || !channels) throw new WavParseError('No fmt chunk');
  if (audioFormat !== FORMAT_PCM && audioFormat !== FORMAT_IEEE_FLOAT) {
    throw new WavParseError(
      `Compressed WAV (format ${audioFormat}) cannot be split without decoding`
    );
  }

  // Derive blockAlign when the header omits it; without a frame size there is
  // no safe place to cut.
  if (!blockAlign) blockAlign = (channels * bitsPerSample) / 8;
  if (!blockAlign) throw new WavParseError('Cannot determine frame size');

  return {
    audioFormat,
    channels,
    sampleRate,
    bitsPerSample,
    blockAlign,
    dataOffset,
    dataSize,
  };
}

/** Playing time of the sample payload, in seconds. */
export function wavDurationSeconds(input: Buffer | WavInfo): number {
  const info = Buffer.isBuffer(input) ? parseWav(input) : input;
  const bytesPerSecond = info.sampleRate * info.blockAlign;
  if (!bytesPerSecond) return 0;
  return info.dataSize / bytesPerSecond;
}

/** Build a canonical 44-byte PCM header for a payload of `dataSize` bytes. */
function buildHeader(info: WavInfo, dataSize: number): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = info.sampleRate * info.blockAlign;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(info.audioFormat, 20);
  header.writeUInt16LE(info.channels, 22);
  header.writeUInt32LE(info.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(info.blockAlign, 32);
  header.writeUInt16LE(info.bitsPerSample, 34);

  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return header;
}

/**
 * Cut a WAV into independently-playable WAV buffers of at most `maxSeconds`.
 *
 * Returns the input untouched when it already fits, so the common short-clip
 * path is not re-encoded. Cuts land on frame boundaries; a cut mid-frame would
 * shift every following sample by a byte and turn speech into noise.
 */
export function chunkWav(buffer: Buffer, maxSeconds: number): Buffer[] {
  if (maxSeconds <= 0) throw new RangeError('maxSeconds must be positive');

  const info = parseWav(buffer);
  if (wavDurationSeconds(info) <= maxSeconds) return [buffer];

  const framesPerChunk = Math.floor(maxSeconds * info.sampleRate);
  const bytesPerChunk = framesPerChunk * info.blockAlign;
  if (bytesPerChunk <= 0) throw new RangeError('maxSeconds is shorter than one frame');

  const chunks: Buffer[] = [];
  const end = info.dataOffset + info.dataSize;

  for (let start = info.dataOffset; start < end; start += bytesPerChunk) {
    const slice = buffer.subarray(start, Math.min(start + bytesPerChunk, end));
    if (slice.length === 0) break;
    chunks.push(Buffer.concat([buildHeader(info, slice.length), slice]));
  }

  return chunks;
}
