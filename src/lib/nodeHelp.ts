import { NodeType } from '@/types/pipeline';

export interface NodeHelpInfo {
  title: string;
  desc: string;
}

export const NODE_DESCRIPTIONS: Record<NodeType, NodeHelpInfo> = {
  audio_input: {
    title: 'Audio Input',
    desc: 'Provides audio recordings (WAV/MP3) as the source data for your AI pipeline.',
  },
  text_input: {
    title: 'Text Input',
    desc: 'Inputs custom text payloads, raw text, or prompting instructions.',
  },
  document_input: {
    title: 'Document Input',
    desc: 'Accepts PDF, DOCX, or text files for regional processing and text extraction.',
  },
  image_input: {
    title: 'Image Input',
    desc: 'Accepts images for optical analysis, visual models, or text OCR processing.',
  },
  video_input: {
    title: 'Video Input',
    desc: 'Provides video files for audio transcription, subtitles, or visual analysis.',
  },
  url_input: {
    title: 'URL Input',
    desc: 'Scrapes raw text or contents from public web URL targets.',
  },
  file_input: {
    title: 'File Input',
    desc: 'Accepts generic data assets, csv tables, or logs to feed into other nodes.',
  },
  stt: {
    title: 'Speech to Text (STT)',
    desc: 'Transcribes regional language audio recordings into text using Sarvam AI Saaras:v3.',
  },
  translate: {
    title: 'Translate',
    desc: 'Translates text payloads between supported Indic languages (Hindi, Telugu, Tamil, etc.).',
  },
  tts: {
    title: 'Text to Speech (TTS)',
    desc: 'Synthesizes natural, high-fidelity regional language voice streams using Sarvam AI Bulbul:v3.',
  },
  ocr: {
    title: 'Optical Character Recognition (OCR)',
    desc: 'Performs high-accuracy OCR to extract native language text from images.',
  },
  vision: {
    title: 'Vision AI',
    desc: 'Processes visual imagery to generate descriptions, tags, or detect target objects.',
  },
  llm: {
    title: 'Large Language Model (LLM)',
    desc: 'Queries a generative AI model (e.g. Gemini) to reason, rewrite, or analyze input payloads.',
  },
  summarize: {
    title: 'Summarize',
    desc: 'Compresses long texts and documents into brief key takeaways and summary briefs.',
  },
  sentiment: {
    title: 'Sentiment Analysis',
    desc: 'Classifies text mood and semantic polarity (Positive, Neutral, Negative).',
  },
  keyword_extraction: {
    title: 'Keyword Extraction',
    desc: 'Identifies critical keywords, tags, and core terms in input documents.',
  },
  classification: {
    title: 'Classification',
    desc: 'Categorizes text or files into dynamic user-defined labels and classes.',
  },
  text_output: {
    title: 'Text Output',
    desc: 'Displays the final transcribed, translated, or generated text on the output dashboard.',
  },
  audio_output: {
    title: 'Audio Output',
    desc: 'Streams and plays back synthesized voice audio outputs inside the workspace.',
  },
  file_output: {
    title: 'File Output',
    desc: 'Saves output payloads into a downloadable file format.',
  },
};
