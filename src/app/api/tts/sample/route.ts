import { NextRequest, NextResponse } from 'next/server';
import { executeSarvamTTS } from '@/lib/sarvam';
import { auth } from '@/auth';

const sampleTexts: Record<string, string> = {
  'hi-IN': 'नमस्ते, यह मेरी आवाज़ का एक छोटा सा नमूना है।',
  'en-IN': 'Hello, this is a short sample of my voice.',
  'te-IN': 'నమస్కారం, ఇది నా గొంతు యొక్క చిన్న నమూనా.',
  'ta-IN': 'வணக்கம், இது எனது குரலின் ஒரு சிறிய மாதிரி.',
  'bn-IN': 'নমস্কার, এটি আমার কণ্ঠস্বরের একটি ছোট নমুনা।',
  'kn-IN': 'ನಮಸ್ಕಾರ, ಇದು ನನ್ನ ಧ್ವನಿಯ ಸಣ್ಣ ಮಾದರಿ.',
  'ml-IN': 'നമസ്കാരം, ഇത് എന്റെ ശബ്ദത്തിന്റെ ഒരു ചെറിയ മാതൃകയാണ്.',
  'mr-IN': 'नमस्कार, हा माझ्या आवाजाचा एक छोटा नमुना आहे.',
  'gu-IN': 'નમસ્તે, આ મારા અવાજનો એક નાનો નમૂનો છે.',
  'pa-IN': 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਇਹ ਮੇਰੀ ਆਵਾਜ਼ ਦਾ ਇੱਕ ਛੋਟਾ ਨਮੂਨਾ ਹੈ।',
  'od-IN': 'ନମସ୍କାର, ଏହା ମୋର ସ୍ୱରର ଏକ ଛୋଟ ନମୁନା |',
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { speaker, target_language_code } = await req.json();
    const lang = target_language_code || 'hi-IN';
    const text = sampleTexts[lang] || sampleTexts['en-IN'];

    const response = await executeSarvamTTS({
      text,
      target_language_code: lang,
      speaker: speaker || 'aditya',
      pace: 1.0,
      model: 'bulbul:v3',
    });

    if (response.audios && response.audios.length > 0) {
      return NextResponse.json({ audioBase64: response.audios[0] });
    } else {
      throw new Error('No audio returned from Sarvam API');
    }
  } catch (err: any) {
    console.error('TTS Sample generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
