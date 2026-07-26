import { NextRequest, NextResponse } from 'next/server';
import { executeSarvamTranslate, executeSarvamTTS } from '@/lib/sarvam';

const MAX_PLAYGROUND_CHARACTERS = 50; // Cut limit to 50 characters for cost saving

type Bucket = {
  tokens: number;
  lastRefill: number; // timestamp in ms
};

// Strict dedicated rate limiter for the free public trial
const playgroundBuckets = new Map<string, Bucket>();
const PLAYGROUND_MAX_REQ_PER_MIN = 5; // Restricted to 5 requests per minute
const PLAYGROUND_BURST_CAPACITY = 2; // Maximum burst allowance of 2 requests
const REFILL_INTERVAL_MS = 60_000;

function checkPlaygroundRateLimit(ip: string): boolean {
  const now = Date.now();
  let bucket = playgroundBuckets.get(ip);
  if (!bucket) {
    bucket = { tokens: PLAYGROUND_MAX_REQ_PER_MIN + PLAYGROUND_BURST_CAPACITY, lastRefill: now };
    playgroundBuckets.set(ip, bucket);
  }

  const elapsed = now - bucket.lastRefill;
  if (elapsed > 0) {
    const refillTokens = (elapsed / REFILL_INTERVAL_MS) * PLAYGROUND_MAX_REQ_PER_MIN;
    bucket.tokens = Math.min(
      PLAYGROUND_MAX_REQ_PER_MIN + PLAYGROUND_BURST_CAPACITY,
      bucket.tokens + refillTokens
    );
    bucket.lastRefill = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return false; // Not rate limited
  }
  return true; // Rate limited
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // Apply tight local rate limiter to playground
  if (checkPlaygroundRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Free trial is limited to 5 requests per minute.' },
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
        { error: `Input exceeds the limit of ${MAX_PLAYGROUND_CHARACTERS} characters for the free trial version.` },
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
