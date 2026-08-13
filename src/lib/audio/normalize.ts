/**
 * Browser-side audio normalisation.
 *
 * MediaRecorder produces WebM/Opus, and uploads arrive as whatever the user
 * had — mp3, m4a, ogg. None of those can be cut into 30-second pieces on the
 * server without a decoder, and Sarvam's synchronous endpoint refuses anything
 * longer than that.
 *
 * The browser already has a decoder for every format it can play, so the
 * conversion happens here: decode, downmix to mono, resample to 16kHz, and
 * write a plain WAV. The server then only ever sees uncompressed audio it can
 * split with header arithmetic, and 16kHz mono is what Sarvam wants anyway.
 */

/** Sarvam's models are trained at 16kHz; sending more is bytes on the wire for no accuracy. */
const TARGET_SAMPLE_RATE = 16000;
const TARGET_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

export interface NormalizedAudio {
  blob: Blob;
  /** Playing time, used to bill STT per 30-second segment. */
  durationSeconds: number;
}

export class AudioDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AudioDecodeError';
  }
}

type AudioContextCtor = typeof AudioContext;
type OfflineAudioContextCtor = typeof OfflineAudioContext;

function getAudioContextCtor(): AudioContextCtor {
  const ctor =
    typeof AudioContext !== 'undefined'
      ? AudioContext
      : (globalThis as unknown as { webkitAudioContext?: AudioContextCtor })
          .webkitAudioContext;
  if (!ctor) throw new AudioDecodeError('This browser cannot decode audio');
  return ctor;
}

function getOfflineAudioContextCtor(): OfflineAudioContextCtor {
  const ctor =
    typeof OfflineAudioContext !== 'undefined'
      ? OfflineAudioContext
      : (globalThis as unknown as { webkitOfflineAudioContext?: OfflineAudioContextCtor })
          .webkitOfflineAudioContext;
  if (!ctor) throw new AudioDecodeError('This browser cannot resample audio');
  return ctor;
}

/** Write mono float samples as a 16-bit PCM WAV. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = BITS_PER_SAMPLE / 8;
  const blockAlign = TARGET_CHANNELS * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, 'WAVE');

  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, TARGET_CHANNELS, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);

  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp before scaling: rendering can overshoot ±1, and letting it wrap
    // turns a loud moment into a burst of noise the model reads as garbage.
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Decode any playable audio into 16kHz mono WAV.
 *
 * Throws {@link AudioDecodeError} when the browser cannot decode the input,
 * which is the honest outcome — a file the browser cannot read is one the
 * server cannot split either.
 */
export async function normalizeToWav(input: Blob | ArrayBuffer): Promise<NormalizedAudio> {
  const sourceBytes = input instanceof Blob ? await input.arrayBuffer() : input;
  if (sourceBytes.byteLength === 0) {
    throw new AudioDecodeError('The recording is empty');
  }

  const context = new (getAudioContextCtor())();
  let decoded: AudioBuffer;
  try {
    // decodeAudioData detaches the buffer it is given, so hand it a copy —
    // otherwise a retry or a later read sees zero bytes.
    decoded = await context.decodeAudioData(sourceBytes.slice(0));
  } catch {
    throw new AudioDecodeError('This audio format could not be read');
  } finally {
    void context.close();
  }

  const frames = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE);
  if (frames <= 0) throw new AudioDecodeError('The recording has no audio in it');

  // Rendering into a mono 16kHz context does the downmix and the resample in
  // one pass, using the browser's own resampler rather than a hand-rolled one.
  const offline = new (getOfflineAudioContextCtor())(
    TARGET_CHANNELS,
    frames,
    TARGET_SAMPLE_RATE
  );
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  return {
    blob: encodeWav(rendered.getChannelData(0), TARGET_SAMPLE_RATE),
    durationSeconds: decoded.duration,
  };
}

/** Read a blob as a data URL, the shape the pipeline nodes already carry audio in. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new AudioDecodeError('Could not read the audio file'));
    reader.readAsDataURL(blob);
  });
}
