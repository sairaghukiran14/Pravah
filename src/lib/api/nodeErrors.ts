/**
 * Turns a raw node failure into something a user can act on.
 *
 * Errors reaching this point are a mix of our own validation messages, Sarvam's
 * HTTP responses with their JSON body attached, and whatever fetch/undici threw.
 * Showing those verbatim tells the person looking at the canvas nothing about
 * what to do next — a node that stops on "Sarvam STT Error (400): {...}" reads
 * as a broken product rather than a 30-second clip limit.
 *
 * Classification lives on the server so the wording is decided in one place and
 * can be tested, rather than re-derived from substring checks in the UI.
 */

export type NodeFailureCode =
  | 'audio_too_long'
  | 'audio_too_large'
  | 'text_too_long'
  | 'provider_credits'
  | 'provider_auth'
  | 'provider_rate_limited'
  | 'provider_unavailable'
  | 'provider_rejected'
  | 'node_misconfigured'
  | 'storage_unavailable'
  | 'network'
  | 'timeout'
  | 'unknown';

export interface NodeFailure {
  code: NodeFailureCode;
  /** Short headline for the dialog. */
  title: string;
  /** One or two sentences of plain language: what went wrong. */
  summary: string;
  /** Concrete next steps, most likely fix first. Never empty. */
  remediation: string[];
  /** The original message, kept for the disclosure and for support. */
  technical: string;
  /**
   * True when the cause sits with the provider or the deployment rather than
   * with anything the user did — the UI should not imply they misconfigured it.
   */
  isProviderIssue: boolean;
}

/** Friendly names so the dialog can say "the Speech-to-Text node", not "the stt node". */
const NODE_LABELS: Record<string, string> = {
  stt: 'Speech-to-Text',
  translate: 'Translate',
  tts: 'Text-to-Speech',
  llm: 'LLM',
  summarize: 'Summarize',
  ocr: 'OCR',
  sentiment: 'Sentiment',
  classification: 'Classification',
  keyword_extraction: 'Keyword Extraction',
  transliteration: 'Transliteration',
  language_detect: 'Language Detection',
  codemix_normalizer: 'Code-Mix Cleaner',
  vector_search: 'Vector Query',
  webhook: 'Webhook',
  sms_sender: 'SMS Sender',
};

export function nodeTypeLabel(nodeType: string): string {
  return NODE_LABELS[nodeType] || nodeType.replace(/_/g, ' ');
}

/** Pull the HTTP status out of the messages this codebase throws, e.g. "Sarvam STT Error (429): ...". */
function extractStatus(message: string): number | null {
  const match = message.match(/\((\d{3})\)/);
  if (match) return Number(match[1]);
  const bare = message.match(/\b(4\d{2}|5\d{2})\b/);
  return bare ? Number(bare[1]) : null;
}

/**
 * Classify a node failure.
 *
 * Ordered most specific first: a message can satisfy several of these tests at
 * once (Sarvam's 402 body mentions both a status and "credits"), and the first
 * match is the one that produces the most useful advice.
 */
export function classifyNodeError(
  rawMessage: unknown,
  nodeType: string
): NodeFailure {
  const technical =
    typeof rawMessage === 'string' && rawMessage.trim()
      ? rawMessage.trim()
      : rawMessage instanceof Error && rawMessage.message
        ? rawMessage.message
        : 'Node execution failed';

  const text = technical.toLowerCase();
  const status = extractStatus(technical);
  const label = nodeTypeLabel(nodeType);

  // --- Input shape: the user can fix these directly, so they come first. ---

  if (text.includes('duration exceeds') || text.includes('longer than 30 seconds')) {
    return {
      code: 'audio_too_long',
      title: 'Audio is too long to transcribe in one piece',
      summary:
        'Recordings are transcribed in 30-second segments. This file is longer than that and is in a format that cannot be split automatically.',
      remediation: [
        'Re-record the audio in the editor — recordings made here are converted to a format that can be split.',
        'Or convert the file to WAV before uploading it.',
      ],
      technical,
      isProviderIssue: false,
    };
  }

  if (text.includes('exceeds limit of') && text.includes('mb')) {
    return {
      code: 'audio_too_large',
      title: 'Audio file is too large',
      summary: `The ${label} node received a file bigger than this workspace allows.`,
      remediation: [
        'Trim the recording, or split it across separate runs.',
        'Uploading a mono file rather than stereo roughly halves the size.',
      ],
      technical,
      isProviderIssue: false,
    };
  }

  if (text.includes('exceeds limit of') && text.includes('characters')) {
    return {
      code: 'text_too_long',
      title: 'Too much text for one request',
      summary: `The ${label} node received more text than it can process in a single call.`,
      remediation: [
        'Add a Summarize node before this one to shorten the text.',
        'Or split the text across several runs.',
      ],
      technical,
      isProviderIssue: false,
    };
  }

  // --- Provider conditions. ---

  if (
    status === 402 ||
    text.includes('insufficient') ||
    text.includes('quota') ||
    (text.includes('credit') && !text.includes('run budget'))
  ) {
    return {
      code: 'provider_credits',
      title: 'The AI provider is out of credits',
      summary:
        'Sarvam AI rejected the request because the account behind this deployment has no credits left. This is not a problem with your pipeline or your wallet.',
      remediation: ['Contact the administrator to top up the provider account.'],
      technical,
      isProviderIssue: true,
    };
  }

  if (status === 401 || status === 403 || text.includes('unauthorized') || text.includes('invalid api key')) {
    return {
      code: 'provider_auth',
      title: 'The AI provider rejected our credentials',
      summary:
        'Sarvam AI refused the request because the API key is missing, expired, or not valid for this model.',
      remediation: ['Contact the administrator — the SARVAM_API_KEY needs checking.'],
      technical,
      isProviderIssue: true,
    };
  }

  if (status === 429 || text.includes('rate limit') || text.includes('too many requests')) {
    return {
      code: 'provider_rate_limited',
      title: 'Too many requests to the AI provider',
      summary:
        'Sarvam AI is throttling requests. Long audio is transcribed as several calls in a row, which can reach the limit faster.',
      remediation: [
        'Wait a minute and run the pipeline again.',
        'If it keeps happening, run fewer pipelines at the same time.',
      ],
      technical,
      isProviderIssue: true,
    };
  }

  if (status !== null && status >= 500) {
    return {
      code: 'provider_unavailable',
      title: 'The AI provider is having trouble',
      summary: `Sarvam AI returned a server error for the ${label} node. Requests are retried automatically, so this one failed after several attempts.`,
      remediation: [
        'Try running the pipeline again in a few minutes.',
        'If it persists, check Sarvam AI’s status page.',
      ],
      technical,
      isProviderIssue: true,
    };
  }

  // --- Local and transport conditions. ---

  if (text.includes('timeout') || text.includes('timed out') || text.includes('etimedout')) {
    return {
      code: 'timeout',
      title: 'The request took too long',
      summary: `The ${label} node gave up waiting for a response.`,
      remediation: [
        'Run the pipeline again — this is usually temporary.',
        'Shorter input finishes faster and is less likely to time out.',
      ],
      technical,
      isProviderIssue: true,
    };
  }

  if (
    text.includes('r2') ||
    text.includes('s3') ||
    text.includes('bucket') ||
    text.includes('nosuchkey')
  ) {
    return {
      code: 'storage_unavailable',
      title: 'A stored file could not be read',
      summary: `The ${label} node could not fetch the file it was given. The upload may have expired or failed to store.`,
      remediation: [
        'Re-upload the file and run the pipeline again.',
        'If it keeps failing, contact the administrator — object storage may be misconfigured.',
      ],
      technical,
      isProviderIssue: true,
    };
  }

  if (
    text.includes('fetch failed') ||
    text.includes('enotfound') ||
    text.includes('econnrefused') ||
    text.includes('econnreset') ||
    text.includes('network')
  ) {
    return {
      code: 'network',
      title: 'Could not reach the service',
      summary: `The ${label} node could not open a connection to the service it depends on.`,
      remediation: [
        'Run the pipeline again in a moment.',
        'If every run fails this way, the deployment may have lost outbound network access.',
      ],
      technical,
      isProviderIssue: true,
    };
  }

  // A 400 that matched none of the specific cases above is almost always a
  // config value the node did not accept — an unsupported language pair, a
  // speaker the model does not have.
  if (status === 400 || text.includes('invalid') || text.includes('required')) {
    return {
      code: 'node_misconfigured',
      title: `The ${label} node was rejected as configured`,
      summary:
        'The service refused this request because one of the node’s settings is not valid for it — often an unsupported language, script, or voice.',
      remediation: [
        `Open the ${label} node and check its settings, especially language and model.`,
        'The technical detail below usually names the field at fault.',
      ],
      technical,
      isProviderIssue: false,
    };
  }

  return {
    code: 'unknown',
    title: `The ${label} node failed`,
    summary:
      'This node stopped with an error that has no specific guidance yet. The technical detail below is the full message.',
    remediation: [
      'Run the pipeline again — some failures are transient.',
      'If it repeats, share the technical detail below when reporting it.',
    ],
    technical,
    isProviderIssue: false,
  };
}
