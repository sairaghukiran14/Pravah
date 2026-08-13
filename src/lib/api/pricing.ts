/**
 * Per-node run pricing.
 *
 * Kept apart from the route so the rates can be exercised directly in tests —
 * these functions decide what a user is charged, and a silent regression here
 * is not visible anywhere until it shows up in the ledger.
 */

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

/** Credits consumed by one node, given the input it processed. */
export function nodeCost(nodeType: string, input: any): number {
  if (nodeType === 'stt') return 0.375; // baseline 30s of audio
  if (nodeType === 'translate') return billableText(input).length * 0.003; // ₹3.00 / 1k chars
  if (nodeType === 'tts') return billableText(input).length * 0.00225; // ₹2.25 / 1k chars
  const free = ['audio_input', 'audio_output', 'text_input', 'text_output'];
  if (free.includes(nodeType)) return 0;
  // Language detection is a single short classification call against a 1000
  // character sample — an order cheaper than a node that runs the 105B model.
  if (nodeType === 'language_detect') return 0.05;
  return 0.5;
}
