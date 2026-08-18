import { z } from 'zod';
import { route } from '@/lib/api/route';
import { executeSarvamLLM, executeSarvamSTT } from '@/lib/sarvam';
import { badRequest } from '@/lib/api/errors';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const bodySchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  description: z.string().optional(),
  audio: z.string().optional(), // base64 representation of recorded requirement
  languageCode: z.string().optional(), // for STT translation/transcription
  chatHistory: z.array(messageSchema).optional(),
});

const SYSTEM_PROMPT = `You are Pravah AI, an expert visual AI workflow designer. Construct node-based visual pipelines for processing speech, translation, and text logic.
Respond ONLY with a single JSON object. Do not include any other markdown text or chatter.
The "message" inside the JSON MUST be extremely concise (under 10 words, e.g. "Here is your Hindi voice translation pipeline.").

If details are missing, set "needsDetails": true, "pipeline": null and ask a clarification. If details are sufficient or defaults can be assumed, set "needsDetails": false and return the "pipeline" structure. Ensure all nodes are fully connected by edges (no orphaned nodes). Response language must match the user's input language.

Available Nodes & Configs:
- audio_input: { "input_type": "upload" | "microphone" }
- text_input / image_input / video_input / url_input / ocr / summarize / sentiment / keyword_extraction / classification / language_detect / text_output / audio_output / file_output: {}
- document_input: { "format": "pdf" | "docx" | "txt" }
- stt: { "model": "saaras:v3", "language_code": string (e.g. "hi-IN", "te-IN", "ta-IN", "en-IN"), "mode": "transcribe" | "translate" | "codemix" }
- translate: { "source_language_code": "auto" | string, "target_language_code": string, "mode": "formal" | "classic-colloquial" }
- tts: { "model": "bulbul:v3", "target_language_code": string, "speaker": string (e.g. "aditya", "ritu", "diya"), "pace": number }
- podcast: { "speaker_a": string, "speaker_b": string, "target_language_code": string, "conversation_style": "debate" | "casual" }
- llm: { "system_prompt": string, "prompt": string, "temperature": number }
- router: { "condition_type": "contains" | "equals", "condition_value": string }
- delay: { "seconds": number }
- pdf_splitter: { "chunk_size": number, "chunk_overlap": number }
- vector_search: { "query": string, "fallback_context": string }
- transliteration: { "source_language_code": string, "target_language_code": string }
- codemix_normalizer: { "target_language": string }
- webhook: { "http_method": "POST", "webhook_url": string }
- sms_sender: { "recipient": string }

Connection Rules:
- First node (e.g. audio_input, text_input) connects to a processing node, which connects to output.
- Edges are defined by index in the nodes list (0, 1, 2, ...).
- Output handles: "output" for standard nodes; "true" or "false" for router. Input handles: "input".
- Position nodes horizontally. E.g. node 0: x: 100, y: 250; node 1: x: 350, y: 250; node 2: x: 600, y: 250. Keep Y constant around 250.

JSON Format:
{
  "message": "Extremely brief (under 10 words) reply.",
  "needsDetails": boolean,
  "pipeline": null | {
    "name": "Pipeline name",
    "description": "Short description",
    "nodes": [{ "type": "node_type", "label": "Label", "x": number, "y": number, "config": { ... } }],
    "edges": [{ "source": number, "target": number, "sourceHandle": "output" | "true", "targetHandle": "input" }]
  }
}`;

export const POST = route({ cost: 10, body: bodySchema }, async ({ body }) => {
  const { description, audio, languageCode, chatHistory } = body;

  let userInputText = description || '';

  // Transcribe audio if provided
  if (audio) {
    try {
      const sttRes = await executeSarvamSTT({
        file: audio,
        language_code: languageCode || 'en-IN',
        mode: 'transcribe',
      });

      if (sttRes?.transcript) {
        userInputText = (userInputText + ' ' + sttRes.transcript).trim();
      }
    } catch (err: any) {
      console.error('Failed to transcribe audio requirement:', err);
      throw badRequest(`Audio transcription failed: ${err.message}`);
    }
  }

  if (!userInputText.trim()) {
    return {
      message: 'Please provide a description of the pipeline or upload/record audio of your requirement.',
      needsDetails: true,
      pipeline: null,
    };
  }



  // Format the prompt containing history
  const messages: string[] = [];
  if (chatHistory && chatHistory.length > 0) {
    for (const msg of chatHistory) {
      messages.push(`${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`);
    }
  }
  messages.push(`User: ${userInputText}`);
  const finalPrompt = messages.join('\n\n');

  try {
    const llmRes = await executeSarvamLLM({
      system_prompt: SYSTEM_PROMPT,
      prompt: finalPrompt,
      model: 'sarvam-105b-conversations',
      temperature: 0.1, // Keep temperature low to prevent JSON syntax issues
    });

    let rawOutput = llmRes.response.trim();

    // Clean markdown code blocks if the LLM outputted them
    if (rawOutput.startsWith('```')) {
      const firstLineEnd = rawOutput.indexOf('\n');
      const lastBackticks = rawOutput.lastIndexOf('```');
      if (firstLineEnd !== -1 && lastBackticks !== -1) {
        rawOutput = rawOutput.substring(firstLineEnd + 1, lastBackticks).trim();
      }
    }

    try {
      const parsed = JSON.parse(rawOutput);
      return parsed;
    } catch (parseError) {
      console.error('Failed to parse LLM JSON response:', rawOutput, parseError);
      return {
        message: llmRes.response,
        needsDetails: true,
        pipeline: null,
      };
    }
  } catch (llmError: any) {
    console.error('Sarvam LLM pipeline generation failed:', llmError);
    return {
      message: `Failed to communicate with Sarvam AI: ${llmError.message}`,
      needsDetails: true,
      pipeline: null,
    };
  }
});
