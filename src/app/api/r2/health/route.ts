import { NextRequest, NextResponse } from 'next/server';
import { checkR2Connection } from '@/lib/r2';
import { auth } from '@/auth';
import { rateLimit } from '@/middleware/rateLimit';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (await rateLimit(req)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const status = await checkR2Connection();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      {
        connected: false,
        message: `Cloudflare R2 Health Check Exception: ${error.message}`,
      },
      { status: 500 }
    );
  }
}
