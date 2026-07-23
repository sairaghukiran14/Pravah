import { NextResponse } from 'next/server';
import { checkR2Connection } from '@/lib/r2';

export async function GET() {
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
