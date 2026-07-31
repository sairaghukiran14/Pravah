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

    // Fetch the audio from R2 and proxy it to avoid CORS issues in WaveSurfer
    const audioResponse = await fetch(presignedUrl);
    
    if (!audioResponse.ok) {
      throw new Error(`R2 fetch failed: ${audioResponse.statusText}`);
    }

    // Determine content type based on extension to avoid browser MediaErrors
    const ext = filename.split('.').pop()?.toLowerCase();
    let contentType = 'audio/wav'; // default
    if (ext === 'mp3') contentType = 'audio/mpeg';
    else if (ext === 'ogg') contentType = 'audio/ogg';
    else if (ext === 'webm') contentType = 'audio/webm';
    else if (ext === 'flac') contentType = 'audio/flac';
    else if (ext === 'mp4' || ext === 'm4a') contentType = 'audio/mp4';

    // Stream the audio back to the client
    return new NextResponse(audioResponse.body, {
      status: audioResponse.status,
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioResponse.headers.get('Content-Length') || '',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error: any) {
    console.error('Error serving audio proxy:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio URL' },
      { status: 500 }
    );
  }
}
