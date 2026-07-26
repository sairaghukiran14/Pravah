import { NextRequest, NextResponse } from 'next/server';
import { executeSarvamTranslate, executeSarvamTTS } from '@/lib/sarvam';
import { rateLimit } from '@/middleware/rateLimit';

const MAX_PLAYGROUND_CHARACTERS = 100;

export async function POST(req: NextRequest) {
  // Apply rate limiter for public route
  if (await rateLimit(req)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a minute.' },
      { status: 429 }
    );
  }

  try {
    const { action, text, targetLanguageCode, speaker } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Input text is required' }, { status: 400 });
    }

    if (text.length > MAX_PLAYGROUND_CHARACTERS) {
      return NextResponse.json(
        { error: `Input exceeds the limit of ${MAX_PLAYGROUND_CHARACTERS} characters for the trial version.` },
        { status: 400 }
      );
    }

    if (!targetLanguageCode || typeof targetLanguageCode !== 'string') {
      return NextResponse.json({ error: 'Target language code is required' }, { status: 400 });
    }

    if (action === 'translate') {
      const result = await executeSarvamTranslate({
        input: text,
        target_language_code: targetLanguageCode,
        source_language_code: 'auto',
      });
      return NextResponse.json({ translatedText: result.translated_text });
    } else if (action === 'tts') {
      const result = await executeSarvamTTS({
        text: text,
        target_language_code: targetLanguageCode,
        speaker: speaker || 'aditya',
      });
      return NextResponse.json({ audios: result.audios, format: result.format });
    } else {
      return NextResponse.json(
        { error: 'Invalid action specified. Must be "translate" or "tts".' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[Playground API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Playground Execution Failed' },
      { status: 500 }
    );
  }
}
