import { uploadToR2 } from '@/lib/r2';
import { route } from '@/lib/api/route';
import { badRequest } from '@/lib/api/errors';

const MAX_AUDIO_SIZE_MB = Number(process.env.SARVAM_MAX_AUDIO_SIZE_MB || 10);
const ALLOWED_PREFIXES = ['audio/', 'video/'];

export const POST = route({ cost: 5 }, async ({ req, userId }) => {
  const formData = await req.formData();
  const file = formData.get('file');

  if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
    throw badRequest('No file provided');
  }

  const blob = file as File;

  if (blob.size > MAX_AUDIO_SIZE_MB * 1024 * 1024) {
    throw badRequest(`File exceeds the ${MAX_AUDIO_SIZE_MB}MB limit`);
  }

  const contentType = blob.type || 'audio/wav';
  if (!ALLOWED_PREFIXES.some((p) => contentType.startsWith(p))) {
    throw badRequest('Only audio files can be uploaded');
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const safeName = blob.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
  const fileName = `audio_input_${userId}_${Date.now()}_${safeName}`;

  await uploadToR2({ fileBuffer: buffer, fileName, contentType });

  return {
    success: true,
    key: fileName,
    url: `/api/audio/file?key=${encodeURIComponent(fileName)}`,
    name: blob.name,
    size: buffer.length,
    contentType,
  };
});
