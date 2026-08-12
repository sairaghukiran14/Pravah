import { z } from 'zod';

/**
 * Per-node-type validation for the config a client submits with a run.
 *
 * Node config is not inert data: it becomes LLM system prompts, outbound URLs,
 * Sarvam API parameters and loop bounds. Accepting `Record<string, any>` meant
 * the only thing standing between a crafted request and those sinks was the
 * editor UI, which is not where validation counts.
 *
 * Two deliberate choices:
 *
 *  - Schemas are LOOSE. Every field named here is type-checked and bounded, but
 *    unknown keys pass through untouched. Pipelines already in the database
 *    carry editor state we do not model (upload blobs, cached previews), and
 *    rejecting those would break saved work to no security benefit.
 *
 *  - An unrecognised node type gets the permissive fallback rather than a
 *    rejection, so adding a node type to the engine can never fail closed on
 *    an existing pipeline. The types that reach a dangerous sink are all
 *    enumerated below.
 */

const loose = z.looseObject({});

/** Sarvam language tags, e.g. hi-IN. `auto`/`unknown` are accepted for detection. */
const languageCode = z
  .string()
  .max(16)
  .regex(/^([a-z]{2,4}-[A-Z]{2}|auto|unknown)$/, 'Expected a language code such as hi-IN');

const promptText = z.string().max(20_000);

/** Bounded so a config cannot ask the engine to loop or sleep indefinitely. */
const chunkSize = z.coerce.number().int().min(1).max(20_000);
const chunkOverlap = z.coerce.number().int().min(0).max(20_000);

const NODE_CONFIG_SCHEMAS: Record<string, z.ZodType> = {
  stt: z.looseObject({
    language_code: languageCode.optional(),
    model: z.string().max(64).optional(),
    mode: z.enum(['transcribe', 'translate', 'verbatim', 'translit', 'codemix']).optional(),
  }),

  translate: z.looseObject({
    source_language_code: languageCode.optional(),
    target_language_code: languageCode.optional(),
    mode: z.enum(['formal', 'classic-colloquial', 'modern-colloquial']).optional(),
  }),

  tts: z.looseObject({
    target_language_code: languageCode.optional(),
    speaker: z.string().max(64).optional(),
    pace: z.coerce.number().min(0.3).max(3).optional(),
    model: z.string().max(64).optional(),
  }),

  podcast: z.looseObject({
    target_language_code: languageCode.optional(),
    speaker_a: z.string().max(64).optional(),
    speaker_b: z.string().max(64).optional(),
    // Each turn is a separate synthesis call, so this bounds both cost and time.
    turns: z.coerce.number().int().min(1).max(20).optional(),
    conversation_style: z.enum(['debate', 'interview', 'casual']).optional(),
    script_type: z.enum(['formal', 'code-mixed']).optional(),
    inject_fillers: z.boolean().optional(),
    pace_a: z.coerce.number().min(0.3).max(3).optional(),
    pace_b: z.coerce.number().min(0.3).max(3).optional(),
  }),

  llm: z.looseObject({
    model: z.string().max(64).optional(),
    prompt: promptText.optional(),
    system_prompt: promptText.optional(),
    temperature: z.coerce.number().min(0).max(2).optional(),
  }),

  summarize: z.looseObject({ length: z.string().max(32).optional() }),

  classification: z.looseObject({ categories: z.string().max(2_000).optional() }),

  vision: z.looseObject({
    language: languageCode.optional(),
    prompt: promptText.optional(),
    output_format: z.enum(['html', 'md']).optional(),
  }),

  transliteration: z.looseObject({
    source_script: z.string().max(64).optional(),
    target_script: z.string().max(64).optional(),
  }),

  codemix_normalizer: z.looseObject({ target_language: z.string().max(64).optional() }),

  pdf_splitter: z.looseObject({
    chunk_size: chunkSize.optional(),
    chunk_overlap: chunkOverlap.optional(),
  }),

  vector_search: z.looseObject({
    query: z.string().max(4_000).optional(),
    fallback_context: z.string().max(200_000).optional(),
  }),

  router: z.looseObject({
    condition_type: z
      .enum(['contains', 'equals', 'starts_with', 'sentiment', 'classification', 'gt', 'gte', 'lt', 'lte'])
      .optional(),
    condition_value: z.string().max(2_000).optional(),
    condition_field: z.string().max(128).optional(),
  }),

  // Bounded because the engine sleeps for this long inside the request, and the
  // function budget is finite.
  delay: z.looseObject({ duration: z.coerce.number().min(0).max(60).optional() }),

  webhook: z.looseObject({
    // Only the scheme is constrained here; safeFetch still applies the egress
    // guard that blocks loopback, private and link-local destinations.
    webhook_url: z.string().max(2_048).optional(),
    http_method: z.enum(['GET', 'POST']).optional(),
  }),

  sms_sender: z.looseObject({
    recipient_phone: z.string().max(32).optional(),
    sms_message: z.string().max(2_000).optional(),
  }),

  text_input: z.looseObject({ text: z.string().max(200_000).optional() }),

  url_input: z.looseObject({ url: z.string().max(2_048).optional() }),
};

export interface NodeConfigIssue {
  nodeId: string;
  nodeType: string;
  path: string;
  message: string;
}

/**
 * Validates one node's config. Returns the parsed value, or the reasons it was
 * rejected — never throws, so the caller can report every bad node at once
 * rather than only the first.
 */
export function parseNodeConfig(
  nodeId: string,
  nodeType: string,
  config: unknown
): { ok: true; config: Record<string, any> } | { ok: false; issues: NodeConfigIssue[] } {
  const schema = NODE_CONFIG_SCHEMAS[nodeType] ?? loose;
  const result = schema.safeParse(config ?? {});

  if (result.success) {
    return { ok: true, config: result.data as Record<string, any> };
  }

  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      nodeId,
      nodeType,
      path: issue.path.join('.') || '(root)',
      message: issue.message,
    })),
  };
}

/** True when this node type has a schema of its own rather than the fallback. */
export function hasNodeConfigSchema(nodeType: string): boolean {
  return nodeType in NODE_CONFIG_SCHEMAS;
}
