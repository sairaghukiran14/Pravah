/**
 * Audio limits shared by the transcription path and the pricing path.
 *
 * These two have to agree: the executor cuts audio into segments of this length
 * and pays Sarvam once per segment, and pricing charges the user once per
 * segment. If they ever drift apart, the difference is absorbed silently and
 * only surfaces in the ledger.
 *
 * Kept free of imports so pricing can stay testable without pulling in the
 * vendor client.
 */

/** Hard ceiling on Sarvam's synchronous /speech-to-text endpoint. */
export const STT_MAX_SECONDS = 30;

/**
 * Largest audio file accepted, in megabytes.
 *
 * Read by both the upload route and the transcription path. These were separate
 * literals reading the same environment variable with different fallbacks, so
 * with the variable unset the upload gate rejected at 10MB while transcription
 * believed it allowed far more — the stricter of the two silently won and the
 * difference looked like an upload bug.
 *
 * Audio is normalised to 16kHz mono WAV, which is uncompressed at 32KB/s, so
 * this converts directly to a duration: 50MB is roughly 27 minutes.
 */
export const MAX_AUDIO_SIZE_MB = Number(process.env.SARVAM_MAX_AUDIO_SIZE_MB || 50);
