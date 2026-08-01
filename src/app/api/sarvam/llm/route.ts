import { NextRequest, NextResponse } from 'next/server';
import { executeSarvamLLM } from '@/lib/sarvam';
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
    const body = await req.json();
    const result = await executeSarvamLLM({
      prompt: body.prompt,
      system_prompt: body.system_prompt,
      input: body.input || body.text,
      model: body.model || 'sarvam-105b',
      temperature: body.temperature,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Sarvam LLM Execution Failed' },
      { status: 500 }
    );
  }
}
