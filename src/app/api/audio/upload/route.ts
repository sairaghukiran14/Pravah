import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { rateLimit } from '@/middleware/rateLimit';
import { uploadToR2 } from '@/lib/r2';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (await rateLimit(req)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `audio_input_${session.user.id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const result = await uploadToR2({
      fileBuffer: buffer,
      fileName,
      contentType: file.type || 'audio/wav',
    });

    return NextResponse.json({
      success: true,
      key: fileName,
      url: `/api/audio/file?key=${fileName}`,
      name: file.name,
      size: buffer.length,
      contentType: file.type,
    });
  } catch (error: any) {
    console.error('Audio upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Audio upload failed' },
      { status: 500 }
    );
  }
}
