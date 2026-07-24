import { NextRequest, NextResponse } from 'next/server';
import { executeSarvamSTT } from '@/lib/sarvam';
import { auth } from '@/auth';
import { rateLimit } from '@/middleware/rateLimit';

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
    const result = await executeSarvamSTT({
      text_input: formData.get('text_input') as string | undefined,
      language_code: formData.get('language_code') as string | undefined,
      model: formData.get('model') as string | undefined,
      mode: formData.get('mode') as string | undefined,
      file: formData.get('file') ? 'uploaded_file_placeholder' : undefined,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'STT Execution Failed' },
      { status: 500 }
    );
  }
}
