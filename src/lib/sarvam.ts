import {
  SarvamSTTRequest,
  SarvamSTTResponse,
  SarvamTranslateRequest,
  SarvamTranslateResponse,
  SarvamTTSRequest,
  SarvamTTSResponse,
} from '@/types/sarvam';
import { downloadFromR2, R2_BUCKET_NAME } from './r2';

const SARVAM_BASE_URL = 'https://api.sarvam.ai';

// Environment based limits for Sarvam API usage
const MAX_AUDIO_SIZE_MB = parseInt(process.env.SARVAM_MAX_AUDIO_SIZE_MB || '10'); // default 10 MB
const MAX_TEXT_LENGTH = parseInt(process.env.SARVAM_MAX_TEXT_LENGTH || '5000'); // default 5000 characters

function getApiKey(): string {
  return process.env.SARVAM_API_KEY || '';
}

/**
 * Validate payload sizes against configured limits.
 * Throws an Error if any limit is exceeded.
 */
function validateSarvamLimits(type: 'stt' | 'translate' | 'tts', payload: any): void {
  if (type === 'stt') {
    if (payload.file) {
      const base64Str = payload.file.includes(',') ? payload.file.split(',')[1] : payload.file;
      const sizeInBytes = (base64Str.length * 3) / 4; // approximate binary size
      const sizeInMB = sizeInBytes / (1024 * 1024);
      if (sizeInMB > MAX_AUDIO_SIZE_MB) {
        throw new Error(`Sarvam STT audio size ${sizeInMB.toFixed(2)}MB exceeds limit of ${MAX_AUDIO_SIZE_MB}MB`);
      }
    }
  } else if (type === 'translate') {
    const text = payload.input || payload.text_input || '';
    if (text.length > MAX_TEXT_LENGTH) {
      throw new Error(`Sarvam Translate input text length ${text.length} exceeds limit of ${MAX_TEXT_LENGTH} characters`);
    }
  } else if (type === 'tts') {
    const text = payload.text || '';
    if (text.length > MAX_TEXT_LENGTH) {
      throw new Error(`Sarvam TTS input text length ${text.length} exceeds limit of ${MAX_TEXT_LENGTH} characters`);
    }
  }
}

/**
 * Speech-to-Text via Sarvam AI API (/speech-to-text)
 */
/**
 * Helper to generate a valid 16kHz mono PCM WAV binary buffer
 * Ensures Sarvam AI STT API always receives a valid, non-corrupt WAV file.
 */
function createValidWavBuffer(seconds = 1): Buffer {
  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = Math.floor(seconds * byteRate);
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

/**
 * Speech-to-Text via Sarvam AI API (/speech-to-text)
 */
export async function executeSarvamSTT(
  payload: SarvamSTTRequest
): Promise<SarvamSTTResponse> {
  const apiKey = getApiKey();

  // If mock key or missing key, return realistic simulated response
  if (!apiKey || apiKey === 'mock_sarvam_api_key' || apiKey.startsWith('your_')) {
    await new Promise((res) => setTimeout(res, 1200)); // Simulate API latency
    return {
      request_id: `stt_${Math.random().toString(36).substring(7)}`,
      transcript: payload.text_input
        ? payload.text_input
        : `[Transcribed Audio]: नमस्ते, सर्वम एआई पाइपलाइन में आपका स्वागत है। (Language: ${payload.language_code || 'hi-IN'})`,
      language_code: payload.language_code || 'hi-IN',
      confidence: 0.96,
    };
  }

  try {
    const formData = new FormData();
    formData.append('model', payload.model || 'saaras:v3');
    formData.append('language_code', payload.language_code || 'hi-IN');
    formData.append('mode', payload.mode || 'transcribe');
    
    let audioBuffer: Buffer | null = null;
    let detectedMime = 'audio/wav';
    let detectedExt = 'wav';

    const getExtAndMime = (source: string): { ext: string; mime: string } => {
      if (source.startsWith('data:')) {
        const mimeMatch = source.match(/^data:([^;]+);/);
        const mime = mimeMatch?.[1] || 'audio/wav';
        let ext = 'wav';
        if (mime.includes('webm')) ext = 'webm';
        else if (mime.includes('mp3') || mime.includes('mpeg')) ext = 'mp3';
        else if (mime.includes('m4a')) ext = 'm4a';
        else if (mime.includes('ogg')) ext = 'ogg';
        return { ext, mime };
      }
      const lowercase = source.toLowerCase();
      if (lowercase.endsWith('.webm')) return { ext: 'webm', mime: 'audio/webm' };
      if (lowercase.endsWith('.mp3') || lowercase.endsWith('.mpeg')) return { ext: 'mp3', mime: 'audio/mpeg' };
      if (lowercase.endsWith('.m4a')) return { ext: 'm4a', mime: 'audio/x-m4a' };
      if (lowercase.endsWith('.ogg')) return { ext: 'ogg', mime: 'audio/ogg' };
      return { ext: 'wav', mime: 'audio/wav' };
    };

    if (payload.file && typeof payload.file === 'string' && payload.file !== 'uploaded_file_placeholder') {
      const isHttp = payload.file.startsWith('http://') || payload.file.startsWith('https://');
      const isLocalProxy = payload.file.startsWith('/api/audio/file');
      
      if (isHttp || isLocalProxy) {
        try {
          const isR2Url = payload.file.includes(`/${R2_BUCKET_NAME}/`) || payload.file.includes('/pravah-assets/');
          if (isLocalProxy || isR2Url) {
            let key = '';
            if (isLocalProxy) {
              const urlObj = new URL(payload.file, 'http://localhost');
              key = urlObj.searchParams.get('key') || '';
            } else {
              const bucketMarker = payload.file.includes(`/${R2_BUCKET_NAME}/`) ? `/${R2_BUCKET_NAME}/` : '/pravah-assets/';
              key = payload.file.substring(payload.file.indexOf(bucketMarker) + bucketMarker.length);
            }
            
            const downloadRes = await downloadFromR2(key);
            audioBuffer = downloadRes.buffer;
            detectedMime = downloadRes.contentType;
            
            if (detectedMime.includes('webm')) detectedExt = 'webm';
            else if (detectedMime.includes('mp3') || detectedMime.includes('mpeg')) detectedExt = 'mp3';
            else if (detectedMime.includes('m4a')) detectedExt = 'm4a';
            else if (detectedMime.includes('ogg')) detectedExt = 'ogg';
            else detectedExt = 'wav';
          } else {
            const audioFetch = await fetch(payload.file);
            const contentType = audioFetch.headers.get('content-type');
            if (contentType) {
              detectedMime = contentType;
              if (contentType.includes('webm')) detectedExt = 'webm';
              else if (contentType.includes('mp3') || contentType.includes('mpeg')) detectedExt = 'mp3';
              else if (contentType.includes('m4a')) detectedExt = 'm4a';
              else if (contentType.includes('ogg')) detectedExt = 'ogg';
            } else {
              const parsed = getExtAndMime(payload.file);
              detectedMime = parsed.mime;
              detectedExt = parsed.ext;
            }
            const arrayBuf = await audioFetch.arrayBuffer();
            audioBuffer = Buffer.from(arrayBuf);
          }
        } catch (e) {
          console.warn('Failed to fetch audio from URL, fallback to silent buffer', e);
        }
      } else if (payload.file.startsWith('data:')) {
        const parsed = getExtAndMime(payload.file);
        detectedMime = parsed.mime;
        detectedExt = parsed.ext;
        const base64Data = payload.file.split(',')[1];
        audioBuffer = Buffer.from(base64Data, 'base64');
      } else if (payload.file.length > 0) {
        const base64Data = payload.file.includes(',') ? payload.file.split(',')[1] : payload.file;
        audioBuffer = Buffer.from(base64Data, 'base64');
      }
    } else if (Buffer.isBuffer(payload.file)) {
      audioBuffer = payload.file;
    }

    if (!audioBuffer || audioBuffer.length < 100) {
      audioBuffer = createValidWavBuffer(1.5);
      detectedMime = 'audio/wav';
      detectedExt = 'wav';
    }

    const blob = new Blob([new Uint8Array(audioBuffer)], { type: detectedMime });
    formData.append('file', blob, `audio.${detectedExt}`);

    // Real call to Sarvam API
    const response = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Sarvam STT Error (${response.status}): ${errText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Sarvam STT execution error:', error);
    throw error;
  }
}

/**
 * Text Translation via Sarvam AI API (/translate)
 */
export async function executeSarvamTranslate(
  payload: SarvamTranslateRequest
): Promise<SarvamTranslateResponse> {
  const apiKey = getApiKey();

  if (!apiKey || apiKey === 'mock_sarvam_api_key' || apiKey.startsWith('your_')) {
    await new Promise((res) => setTimeout(res, 1000));
    
    // Smart mock translation based on target language
    let mockTranslation = `[Translated to ${payload.target_language_code}]: Welcome to the Sarvam AI Node Pipeline Builder.`;
    if (payload.target_language_code === 'hi-IN') {
      mockTranslation = 'सर्वम एआई नोड पाइपलाइन बिल्डर में आपका स्वागत है।';
    } else if (payload.target_language_code === 'te-IN') {
      mockTranslation = 'సర్వం ఏఐ నోడ్ పైప్‌లైన్ బిల్డర్‌కి సుస్వాగతం.';
    } else if (payload.target_language_code === 'ta-IN') {
      mockTranslation = 'சர்வம் ஏஐ நோட் பைப்லைன் பில்டருக்கு நல்வரவு.';
    } else if (payload.target_language_code === 'bn-IN') {
      mockTranslation = 'সর্বম এআই নোড পাইপলাইন বিল্ডারে আপনাকে স্বাগতম।';
    }

    return {
      request_id: `tr_${Math.random().toString(36).substring(7)}`,
      translated_text: mockTranslation,
      source_language_code: payload.source_language_code,
      target_language_code: payload.target_language_code,
    };
  }

  try {
    const response = await fetch(`${SARVAM_BASE_URL}/translate`, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: payload.input || (payload as any).input_text || '',
        source_language_code: payload.source_language_code || 'auto',
        target_language_code: payload.target_language_code,
        mode: payload.mode || 'formal',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Sarvam Translate Error (${response.status}): ${errText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Sarvam Translate execution error:', error);
    throw error;
  }
}

/**
 * Text-to-Speech via Sarvam AI API (/text-to-speech)
 */
export async function executeSarvamTTS(
  payload: SarvamTTSRequest
): Promise<SarvamTTSResponse> {
  const apiKey = getApiKey();

  if (!apiKey || apiKey === 'mock_sarvam_api_key' || apiKey.startsWith('your_')) {
    await new Promise((res) => setTimeout(res, 1400));
    return {
      request_id: `tts_${Math.random().toString(36).substring(7)}`,
      audios: ['UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='], // base64 WAV payload placeholder
      format: 'wav',
    };
  }

  try {
    const response = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [payload.text],
        target_language_code: payload.target_language_code || 'hi-IN',
        speaker: payload.speaker || 'aditya',
        pace: payload.pace || 0.95, // Tune default speed slightly slower for human-like flow
        model: payload.model || 'bulbul:v3',
        temperature: payload.temperature ?? 0.7 // Set prosodic natural variation temperature default
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Sarvam TTS Error (${response.status}): ${errText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Sarvam TTS execution error:', error);
    throw error;
  }
}

export interface SarvamLLMRequest {
  prompt?: string;
  system_prompt?: string;
  input?: string;
  model?: string; // 'sarvam-105b' | 'sarvam-2b'
  temperature?: number;
}

export interface SarvamLLMResponse {
  request_id: string;
  response: string;
  model: string;
}

/**
 * Sarvam-105B & Sarvam-2B LLM Chat Completions via Sarvam AI API (/v1/chat/completions)
 */
export async function executeSarvamLLM(
  payload: SarvamLLMRequest
): Promise<SarvamLLMResponse> {
  const apiKey = getApiKey();
  const modelName = payload.model || 'sarvam-105b';
  const userContent = payload.input || payload.prompt || 'Hello';
  const systemContent = payload.system_prompt || 'You are an AI assistant designed to reason and respond clearly in Indian regional languages and English.';

  if (!apiKey || apiKey === 'mock_sarvam_api_key' || apiKey.startsWith('your_')) {
    await new Promise((res) => setTimeout(res, 1200));
    return {
      request_id: `llm_${Math.random().toString(36).substring(7)}`,
      response: `[${modelName} Sovereign LLM Response]: Analysis completed for prompt input: "${userContent.substring(0, 100)}". Reasoning powered by Sarvam AI.`,
      model: modelName,
    };
  }

  try {
    const response = await fetch(`${SARVAM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        temperature: payload.temperature ?? 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Sarvam LLM (${modelName}) Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || data.response || JSON.stringify(data);

    return {
      request_id: data.id || `llm_${Date.now()}`,
      response: assistantMessage,
      model: modelName,
    };
  } catch (error: any) {
    console.error(`Sarvam LLM (${modelName}) execution error:`, error);
    throw error;
  }
}
