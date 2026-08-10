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
  podcast: {
    title: 'Podcast Generator',
    desc: 'Generates a 2-speaker conversational dialogue script on a topic with distinct perspectives and synthesizes audio.',
  },
  router: {
    title: 'Condition Router',
    desc: 'Evaluates logical rules (e.g. contains, sentiment matches) on upstream text and routes execution down active output paths.',
  },
  delay: {
    title: 'Delay Pause',
    desc: 'Delays pipeline execution path by a configured amount of seconds.',
  },
  pdf_splitter: {
    title: 'Document Chunker',
    desc: 'Splits raw document text into smaller, overlapping chunks suitable for semantic query databases.',
  },
  vector_search: {
    title: 'Vector Search Query',
    desc: 'Performs semantic searches on a text dataset or document chunks to extract the top matching passages.',
  },
  transliteration: {
    title: 'Script Transliteration',
    desc: 'Converts text scripts based on phonetics (e.g. converting Hindi in Devanagari script to Latin characters).',
  },
  codemix_normalizer: {
    title: 'Code-Mix Cleaner',
    desc: 'Standardizes spoken code-mixed slang (such as Hinglish or Tenglish) into standard grammatical sentences.',
  },
  webhook: {
    title: 'Outgoing Webhook API',
    desc: 'Dispatches custom JSON HTTP payloads to external API URLs using POST or GET requests.',
  },
  sms_sender: {
    title: 'SMS Dispatcher',
    desc: 'Triggers automated outbound text messages with transcripts or alerts.',
  },
};
