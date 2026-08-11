import { z } from 'zod';
import { executeSarvamTTS } from '@/lib/sarvam';
import { route } from '@/lib/api/route';
import { ApiError } from '@/lib/api/errors';

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

const bodySchema = z.object({
  speaker: z.string().max(64).optional(),
  target_language_code: z.string().max(16).optional(),
});

// cost 10: this calls the paid Sarvam TTS API on every request, so it is
// throttled like the other synthesis endpoints rather than left open.
export const POST = route({ cost: 10, body: bodySchema }, async ({ body }) => {
  const lang = body.target_language_code || 'hi-IN';
  const text = sampleTexts[lang] || sampleTexts['en-IN'];

  const response = await executeSarvamTTS({
    text,
    target_language_code: lang,
    speaker: body.speaker || 'aditya',
    pace: 1.0,
    model: 'bulbul:v3',
  });

  if (!response.audios?.length) {
    throw new ApiError(502, 'Voice sample could not be generated. Please try again.');
  }

  return { audioBase64: response.audios[0] };
});
