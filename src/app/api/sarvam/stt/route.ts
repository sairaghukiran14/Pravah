import { executeSarvamSTT } from '@/lib/sarvam';
import { route } from '@/lib/api/route';
import { badRequest } from '@/lib/api/errors';

const MAX_AUDIO_SIZE_MB = Number(process.env.SARVAM_MAX_AUDIO_SIZE_MB || 10);

// multipart/form-data, so the body is read here rather than via a Zod schema.
export const POST = route({ cost: 10 }, async ({ req }) => {
  const formData = await req.formData();
  const fileItem = formData.get('file');
  let filePayload: string | undefined;

  if (fileItem && typeof fileItem === 'object' && 'arrayBuffer' in fileItem) {
    const blob = fileItem as Blob;
    if (blob.size > MAX_AUDIO_SIZE_MB * 1024 * 1024) {
      throw badRequest(`Audio file exceeds the ${MAX_AUDIO_SIZE_MB}MB limit`);
    }
    const arrayBuf = await blob.arrayBuffer();
    filePayload = `data:${blob.type || 'audio/wav'};base64,${Buffer.from(arrayBuf).toString('base64')}`;
  } else if (typeof fileItem === 'string') {
    filePayload = fileItem;
  }

  return executeSarvamSTT({
    text_input: (formData.get('text_input') as string) || undefined,
    language_code: (formData.get('language_code') as string) || undefined,
    model: (formData.get('model') as string) || undefined,
    mode: (formData.get('mode') as string) || undefined,
    file: filePayload,
  });
});
