import { z } from 'zod';
import { executeSarvamLLM } from '@/lib/sarvam';
import { route } from '@/lib/api/route';

const MAX_TEXT_LENGTH = Number(process.env.SARVAM_MAX_TEXT_LENGTH || 5000);

const bodySchema = z.object({
  prompt: z.string().max(MAX_TEXT_LENGTH).optional(),
  system_prompt: z.string().max(MAX_TEXT_LENGTH).optional(),
  input: z.string().max(MAX_TEXT_LENGTH).optional(),
  text: z.string().max(MAX_TEXT_LENGTH).optional(),
  model: z.string().max(64).optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
});

export const POST = route({ cost: 10, body: bodySchema }, async ({ body }) => {
  return executeSarvamLLM({
    prompt: body.prompt,
    system_prompt: body.system_prompt,
    input: body.input || body.text,
    model: body.model || 'sarvam-105b',
    temperature: body.temperature,
  });
});
