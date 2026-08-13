/**
 * Per-node run pricing.
 *
 * Kept apart from the route so the rates can be exercised directly in tests —
 * these functions decide what a user is charged, and a silent regression here
 * is not visible anywhere until it shows up in the ledger.
 */
import { STT_MAX_SECONDS } from '@/lib/audio/limits';

/**
 * The text a node actually processed, used to meter per-character pricing.
 *
 * `executeSingleNode` records `{ text }` for entry nodes but `{ payload }` when
 * the input came from an upstream node — and payload may be a string or the
 * previous node's output object. Reading only `.text` silently yielded an empty
 * string for any node with an incoming edge, which is the normal case, so
 * translate and TTS were billed as zero.
 */
export function billableText(input: any): string {
  if (!input) return '';
  if (typeof input.text === 'string') return input.text;

  const payload = input.payload;
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object') {
    return (
      payload.translated_text ||
      payload.transcript ||
      payload.response ||
      payload.text ||
      ''
    );
  }
  return '';
}

/** Seconds of audio a node was handed, or 0 when the duration is unknown. */
export function billableAudioSeconds(input: any): number {
  if (!input) return 0;
  const source =
    input.payload && typeof input.payload === 'object' ? input.payload : input;
  const seconds = Number(source?.durationSeconds);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

/**
 * Sarvam's synchronous STT endpoint caps at 30 seconds, so longer audio is cut
 * into that many requests and billed for that many requests.
 *
 * Audio with no recorded duration bills as one segment. That is the pre-chunking
 * behaviour, and it keeps runs stored before durations were carried from
 * repricing themselves on replay.
 */
export function sttSegments(input: any): number {
  const seconds = billableAudioSeconds(input);
  if (!seconds) return 1;
  return Math.max(1, Math.ceil(seconds / STT_MAX_SECONDS));
}

/** Pages a document node processed, defaulting to one when the count is unknown. */
export function billablePages(input: any): number {
  if (!input) return 1;
  const source =
    input.payload && typeof input.payload === 'object' ? input.payload : input;
  const pages = Number(source?.pageCount);
  return Number.isFinite(pages) && pages >= 1 ? Math.ceil(pages) : 1;
}

/**
 * What a node actually consumed, reported by the node itself.
 *
 * Some nodes only know their billable size after they run — the podcast node
 * synthesises a script first and then speaks it, so the speech it pays Sarvam
 * for does not exist at projection time. Those nodes report usage here and the
 * settlement prices from it; the projection falls back to a conservative
 * estimate so the credit hold still covers the run.
 */
export interface NodeUsage {
  /** Characters sent to text-to-speech across every call the node made. */
  speechChars?: number;
}

/**
 * The system prompt caps each dialogue turn at one or two sentences. 200
 * characters is comfortably above that, so the projection lands above the
 * script the model actually returns and the hold covers the settlement.
 */
const PODCAST_PROJECTED_CHARS_PER_TURN = 200;
const PODCAST_DEFAULT_TURNS = 4;

export interface NodeCostOptions {
  /** Reported by a finished node. Absent while projecting, before the work is done. */
  usage?: NodeUsage;
  /** The node's own settings, for rates driven by configuration rather than input. */
  config?: Record<string, any> | null;
}

/**
 * Credits consumed by one node.
 *
 * Rates are set at 1.5x what Sarvam bills, which is why STT is 0.375 per 30s
 * against their 30/hour and translate is 3.00 per 1k against their 2.00.
 *
 * Called twice per node: once before it runs to hold credit, and once after to
 * settle. Any rate that reads `usage` must project at least as high as it
 * settles, or the node spends more than the hold reserved for it.
 */
export function nodeCost(
  nodeType: string,
  input: any,
  options?: NodeCostOptions
): number {
  const usage = options?.usage;
  if (nodeType === 'stt') return 0.375 * sttSegments(input); // 0.375 per 30s segment
  if (nodeType === 'translate') return billableText(input).length * 0.003; // ₹3.00 / 1k chars
  if (nodeType === 'tts') return billableText(input).length * 0.0045; // ₹4.50 / 1k chars

  // Sarvam bills doc-ai digitisation per page, so charging per node run meant a
  // multi-page PDF cost more to serve than it earned. The page count rides in
  // on the document payload, which keeps the projection exact rather than
  // discovering a 40-page bill after the work is already paid for.
  if (nodeType === 'ocr') return 0.75 * billablePages(input);

  // One script generation plus a text-to-speech call per dialogue turn. Priced
  // at the same rate as the TTS node for the speech it produced; before it runs
  // there is no script yet, so the projection assumes a short one.
  if (nodeType === 'podcast') {
    const speechChars = Number(usage?.speechChars);
    if (Number.isFinite(speechChars) && speechChars > 0) {
      return 0.5 + speechChars * 0.0045;
    }
    const turns = Number(options?.config?.turns) || PODCAST_DEFAULT_TURNS;
    return 0.5 + turns * PODCAST_PROJECTED_CHARS_PER_TURN * 0.0045;
  }

  const free = ['audio_input', 'audio_output', 'text_input', 'text_output'];
  if (free.includes(nodeType)) return 0;
  // Language detection is a single short classification call against a 1000
  // character sample — an order cheaper than a node that runs the 105B model.
  if (nodeType === 'language_detect') return 0.05;
  return 0.5;
}
