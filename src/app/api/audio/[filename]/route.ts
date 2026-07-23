import { NextRequest, NextResponse } from 'next/server';
import { getR2PresignedUrl } from '@/lib/r2';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Generate a presigned URL valid for 1 hour (3600 seconds)
    const presignedUrl = await getR2PresignedUrl(filename, 3600);

    // Redirect the client to the presigned URL
    return NextResponse.redirect(presignedUrl);
  } catch (error: any) {
    console.error('Error serving audio proxy:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio URL' },
      { status: 500 }
    );
  }
}
