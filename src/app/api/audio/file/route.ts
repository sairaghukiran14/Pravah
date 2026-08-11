import { z } from 'zod';
import { downloadFromR2 } from '@/lib/r2';
import { route } from '@/lib/api/route';
import { notFound } from '@/lib/api/errors';

const querySchema = z.object({
  key: z.string().min(1, 'Missing key parameter'),
});

export const GET = route({ cost: 2, query: querySchema }, async ({ query }) => {
  let key = query.key;

  // Self-heal: accept a full URL and reduce it to the object key.
  if (key.startsWith('http://') || key.startsWith('https://')) {
    const bucketMarker = key.includes('/pravah-assets/') ? '/pravah-assets/' : '/pravah-storage/';
    key = key.includes(bucketMarker)
      ? key.substring(key.indexOf(bucketMarker) + bucketMarker.length)
      : key.substring(key.lastIndexOf('/') + 1);
  }

  try {
    const { buffer, contentType } = await downloadFromR2(key);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType || 'audio/wav',
        'Content-Length': buffer.length.toString(),
        // Private: these objects are user content served behind auth, so they
        // must not be retained by shared caches.
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error fetching file from R2:', error);
    throw notFound('File not found');
  }
});
