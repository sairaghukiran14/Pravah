import { z } from 'zod';
import { executeSarvamTTS } from '@/lib/sarvam';
import { route } from '@/lib/api/route';

const MAX_TEXT_LENGTH = Number(process.env.SARVAM_MAX_TEXT_LENGTH || 5000);

const bodySchema = z.object({
  text: z.string().max(MAX_TEXT_LENGTH),
  target_language_code: z.string().max(16).optional(),
  speaker: z.string().max(64).optional(),
  pace: z.coerce.number().min(0.3).max(3).optional(),
  model: z.string().max(64).optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
});

export const POST = route({ cost: 10, body: bodySchema }, async ({ body }) => {
  return executeSarvamTTS({
    text: body.text,
    target_language_code: body.target_language_code ?? 'hi-IN',
    speaker: body.speaker,
    pace: body.pace,
    model: body.model,
    temperature: body.temperature,
  });
});
