import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { rateLimit } from '@/middleware/rateLimit';
import { downloadFromR2 } from '@/lib/r2';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (await rateLimit(req)) {
    return new Response('Too many requests', { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  let key = searchParams.get('key');

  if (!key) {
    return new Response('Missing key parameter', { status: 400 });
  }

  // Self-heal: If key is a full URL, extract the filename key
  if (key.startsWith('http://') || key.startsWith('https://')) {
    const bucketMarker = key.includes('/pravah-assets/') ? '/pravah-assets/' : '/pravah-storage/';
    if (key.includes(bucketMarker)) {
      key = key.substring(key.indexOf(bucketMarker) + bucketMarker.length);
    } else {
      key = key.substring(key.lastIndexOf('/') + 1);
    }
  }

  try {
    const { buffer, contentType } = await downloadFromR2(key);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType || 'audio/wav',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error fetching file from R2:', error);
    return new Response(error.message || 'File not found', { status: 404 });
  }
}
