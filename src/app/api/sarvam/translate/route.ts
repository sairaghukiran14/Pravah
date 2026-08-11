import { z } from 'zod';
import { executeSarvamTranslate } from '@/lib/sarvam';
import { route } from '@/lib/api/route';

const MAX_TEXT_LENGTH = Number(process.env.SARVAM_MAX_TEXT_LENGTH || 5000);

const bodySchema = z.object({
  input: z.string().max(MAX_TEXT_LENGTH).optional(),
  input_text: z.string().max(MAX_TEXT_LENGTH).optional(),
  source_language_code: z.string().max(16).optional(),
  target_language_code: z.string().max(16).optional(),
  mode: z.string().max(32).optional(),
});

export const POST = route({ cost: 5, body: bodySchema }, async ({ body }) => {
  return executeSarvamTranslate({
    input: body.input ?? body.input_text ?? '',
    source_language_code: body.source_language_code ?? 'auto',
    target_language_code: body.target_language_code ?? 'hi-IN',
    mode: body.mode,
  });
});
