import { getR2PresignedUrl } from '@/lib/r2';
import { route } from '@/lib/api/route';
import { badRequest, notFound } from '@/lib/api/errors';

type Params = { filename: string };

const CONTENT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
  flac: 'audio/flac',
  mp4: 'audio/mp4',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
};

export const GET = route<undefined, undefined, Params>(
  { cost: 2 },
  async ({ params }) => {
    const { filename } = params;
    if (!filename) throw badRequest('Filename is required');

    // Keep the key confined to a single object name — no traversal into other
    // prefixes of the bucket.
    if (filename.includes('/') || filename.includes('..')) {
      throw badRequest('Invalid filename');
    }

    const presignedUrl = await getR2PresignedUrl(filename, 3600);
    const audioResponse = await fetch(presignedUrl);

    if (!audioResponse.ok) {
      throw notFound('Audio file not found');
    }

    const ext = filename.split('.').pop()?.toLowerCase() || 'wav';

    return new Response(audioResponse.body, {
      status: audioResponse.status,
      headers: {
        'Content-Type': CONTENT_TYPES[ext] || 'audio/wav',
        'Content-Length': audioResponse.headers.get('Content-Length') || '',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  }
);
