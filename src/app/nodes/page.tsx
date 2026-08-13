'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { 
  Mic, Languages, Volume2, 
  FileText, Image, Video, Link as LinkIcon, 
  Eye, Brain, AlignLeft, Smile, Key, Tags, 
  Monitor, PlayCircle, Download, Mail, FileAudio, Keyboard,
  HelpCircle, ArrowLeft, ArrowRight, Shield, Cpu, Zap, ClipboardList
} from 'lucide-react';

interface NodeDocItem {
  id: string;
  title: string;
  category: 'Input' | 'Processing' | 'Logic' | 'Regional' | 'RAG' | 'Connectors' | 'Output';
  desc: string;
  significance: string;
  howToUse: string;
  internalWorking: string;
  example: string;
  icon: React.ReactNode;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
}

const nodeDocs: NodeDocItem[] = [
  // --- INPUTS ---
  {
    id: 'audio_input',
    title: 'Audio Input',
    category: 'Input',
    desc: 'Serves as the binary entry point for spoken language audio files in the pipeline.',
    significance: 'Enables speech workflows by providing voice recordings. Essential as a source node for Speech-to-Text (STT) and voice diagnostics.',
    howToUse: 'Choose an input type: Mic (to record live audio directly in the browser), Upload (upload WAV, MP3, or M4A files up to 10MB), or URL (point to a public audio link). Connect its output handle to the input handle of an STT or Podcast node.',
    internalWorking: 'Saves recording files temporarily as base64 strings in the store. When the pipeline runs, it uploads the binary data to Cloudflare R2 bucket storage to generate a secure, CDN-cached URL, passing it downstream to avoid bulky payloads.',
    example: '🎙️ Input: Voice recording: "क्या समाचार है?"\n🔊 Output: Secure public CDN URL: "https://r2.pravah.com/assets/input_123.wav"',
    icon: <FileAudio className="h-5 w-5 text-pink-600" />,
    iconBg: 'bg-pink-50',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-800'
  },
  {
    id: 'text_input',
    title: 'Text Input',
    category: 'Input',
    desc: 'Acts as the starting point for static text prompts, system instructions, or raw articles.',
    significance: 'Feeds text directly into reasoning engines (LLMs), translators, or speech synthesizers (TTS).',
    howToUse: 'Type or copy your text inside the configurations text area. You can also click the "Sample Hindi" button to quickly load a demo phrase. Connect the output to Translate, LLM, or TTS nodes.',
    internalWorking: 'Passes the raw string configuration directly downstream. It can incorporate dynamic variables like {{node_id.output}} if referenced by downstream templated text prompts.',
    example: '✍️ Input: "ताज महल की वास्तुकला बहुत सुंदर है।"\n📝 Output: Raw text payload passed to Translator.',
    icon: <Keyboard className="h-5 w-5 text-pink-600" />,
    iconBg: 'bg-pink-50',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-800'
  },
  {
    id: 'document_input',
    title: 'Document Input',
    category: 'Input',
    desc: 'Ingests text files, PDFs, or word documents for downstream extraction.',
    significance: 'Enables Retrieval-Augmented Generation (RAG) and bulk parsing of corporate files.',
    howToUse: 'Upload PDF, TXT, or DOCX files up to 10MB. The file path is sent downstream to document parsing nodes (OCR or Chunker).',
    internalWorking: 'Uploads the document to Cloudflare R2 under the project asset namespace, generating a public URL for downstream nodes to download and unpack.',
    example: '📂 Input: Local document "pricing_guidelines.pdf"\n🔗 Output: R2 Storage URL: "https://r2.pravah.com/docs/pricing_guidelines.pdf"',
    icon: <FileText className="h-5 w-5 text-pink-600" />,
    iconBg: 'bg-pink-50',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-800'
  },
  {
    id: 'image_input',
    title: 'Image Input',
    category: 'Input',
    desc: 'Accepts optical documents (receipts, text images, photos) for visual AI processing.',
    significance: 'Provides the visual payload for optical character recognition and multimodal vision models.',
    howToUse: 'Upload JPEG or PNG images. Connect the output handle to the input handle of OCR or Vision nodes.',
    internalWorking: 'Similar to document nodes, it uploads the image binary to Cloudflare R2 bucket storage to feed CDN URLs into the Sarvam Doc-AI backend endpoints.',
    example: '🖼️ Input: Camera snapshot of an invoice "bill_receipt.png"\n🔗 Output: R2 asset link passed into the OCR processor.',
    icon: <Image className="h-5 w-5 text-pink-600" />,
    iconBg: 'bg-pink-50',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-800'
  },
  {
    id: 'url_input',
    title: 'URL Link Input',
    category: 'Input',
    desc: 'Ingests a public webpage link to scrape its textual content.',
    significance: 'Enables web-crawling, content aggregation, and pipeline execution based on live internet articles.',
    howToUse: 'Input a valid, secure URL (e.g. news articles, blogs). Connect its output to LLM, Summarization, or Translate nodes.',
    internalWorking: 'Sends the URL downstream where execution agents perform fetch queries, stripping HTML tags and returning clean parsed markdown to the subsequent processing nodes.',
    example: '🌐 Input: "https://sarvam.ai/about"\n📑 Output: String value "https://sarvam.ai/about" forwarded to dynamic scraper.',
    icon: <LinkIcon className="h-5 w-5 text-pink-600" />,
    iconBg: 'bg-pink-50',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-800'
  },

  // --- PROCESSING ---
  {
    id: 'stt',
    title: 'STT (Speech to Text)',
    category: 'Processing',
    desc: 'Transcribes regional spoken audio inputs into high-quality written scripts.',
    significance: 'Bridges voice and text by converting Indian dialects to machine-readable Unicode scripts.',
    howToUse: 'Configure target language (default hi-IN). Connect an Audio Input node output to its input handle.',
    internalWorking: 'Calls Sarvam AI Saaras:v3 speech-to-text API. Reads audio binary buffers, encodes them as multipart form payloads, and submits them to the /speech-to-text endpoint, returning the parsed transcription and confidence ratings.',
    example: '🎤 Input: Speech audio file of someone saying "नमस्ते"\n📝 Output: Unicode string "नमस्ते" (Confidence: 0.98)',
    icon: <Mic className="h-5 w-5 text-emerald-600" />,
    iconBg: 'bg-emerald-50',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800'
  },
  {
    id: 'translate',
    title: 'Translate',
    category: 'Processing',
    desc: 'Translates written texts between Indian regional languages and English.',
    significance: 'Enables multi-lingual communication and cross-border language scaling.',
    howToUse: 'Specify the Source Language (or choose auto-detect) and Target Language (Hindi, Telugu, Tamil, etc.). Connect a Text Input or STT output to its input.',
    internalWorking: 'Submits a JSON payload to the Sarvam AI /translate endpoint containing the text, source code, target code, and tone mode (formal/informal). The API returns the translated text response.',
    example: '🌐 Input: "Welcome to our AI platform." (Source: en-IN, Target: te-IN)\n🇮🇳 Output: "మా AI ప్లాట్‌ఫారమ్‌కు స్వాగతం."',
    icon: <Languages className="h-5 w-5 text-blue-600" />,
    iconBg: 'bg-blue-50',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800'
  },
  {
    id: 'tts',
    title: 'TTS (Text to Speech)',
    category: 'Processing',
    desc: 'Synthesizes written text into highly natural, human-like voice audio.',
    significance: 'Powers visual voice responses, regional broadcasts, and IVR systems.',
    howToUse: 'Select the target language, speaker voice (aditya/ritu), and talking pace. Connect a Text Input or Translate output to its input.',
    internalWorking: 'Invokes Sarvam AI Bulbul:v3 Text-to-Speech API. Sends the target text which the synthesizer processes, returning base64 PCM WAV audio. The engine uploads this audio to Cloudflare R2 and passes the playable CDN link downstream.',
    example: '🔊 Input: "माय नेम इस रितु" (Target: hi-IN, Speaker: ritu, Pace: 0.95)\n🎵 Output: Playable base64 audio block and storage link key.',
    icon: <Volume2 className="h-5 w-5 text-orange-600" />,
    iconBg: 'bg-orange-50',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800'
  },
  {
    id: 'llm',
    title: 'Sovereign LLM',
    category: 'Processing',
    desc: 'Queries foundational language models for generative responses, reasoning, or QA.',
    significance: 'The core cognitive layer of the pipeline. Handles decision making, coding, reasoning, and semantic tasks.',
    howToUse: 'Write a system prompt (defines AI persona) and choose a model (e.g. sarvam-105b). Input variables like {{upstream_node}} to inject dynamic values.',
    internalWorking: 'Connects to Sarvam AI chat completions API (/v1/chat/completions). Passes the system and user messages. The reasoning model processes the prompt and returns a structured message choices block.',
    example: '🧠 Input Prompt: "Write a haiku about computers in Hindi"\n💡 Output: "बिजली की सोच, \nतारों में बहता ज्ञान, \nनया जहान।"',
    icon: <Brain className="h-5 w-5 text-purple-600" />,
    iconBg: 'bg-purple-50',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800'
  },

  // --- LOGIC ---
  {
    id: 'router',
    title: 'Router',
    category: 'Logic',
    desc: 'Directs the execution flow down a specific path based on condition values.',
    significance: 'Enables complex branching logic and decision trees in pipelines.',
    howToUse: 'Write condition rules (e.g., if input contains "urgent"). The pipeline will only execute downstream branches matching the true condition.',
    internalWorking: 'Evaluates javascript expressions or regex matches on the upstream string output. Returns boolean flags to the execution coordinator to skip or execute subsequent paths.',
    example: '⚡ Condition: Input contains "refund"\n🛤️ Output: Routes flow to "Escalate Ticket" node; bypasses "General Support" node.',
    icon: <Brain className="h-5 w-5 text-rose-600" />,
    iconBg: 'bg-rose-50',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800'
  },
  {
    id: 'delay',
    title: 'Delay',
    category: 'Logic',
    desc: 'Pauses pipeline execution for a configured duration in seconds.',
    significance: 'Throttles workflows, respects external API rate limits, or staggers automation steps.',
    howToUse: 'Enter the delay duration in seconds (e.g. 3). Connect it in-between processing nodes.',
    internalWorking: 'Creates an execution promise that waits for the specified milliseconds using a setTimeout block before resolving and passing control to the next node.',
    example: '⏱️ Setting: Delay = 5s\n⏳ Output: Pauses the pipeline runtime for 5 seconds before triggering the next node.',
    icon: <PlayCircle className="h-5 w-5 text-rose-600" />,
    iconBg: 'bg-rose-50',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800'
  },

  // --- REGIONAL ---
  {
    id: 'transliteration',
    title: 'Transliterate',
    category: 'Regional',
    desc: 'Converts text between Indic scripts and Roman phonetically, without changing the language.',
    significance: 'Lets a reader who does not know a script still read the words, which matters for broadcast messages and for anyone typing an Indian language on a Roman keyboard.',
    howToUse: 'Pick the source and target language. Connect a Translate or STT output to its input. To change meaning rather than script, use a Translate node instead.',
    internalWorking: "Calls Sarvam's dedicated /transliterate endpoint. It takes language codes rather than script names, so Romanised Hindi is hi-IN to en-IN. Optional settings control whether numerals are written in native digits and whether numbers and abbreviations are spelled the way they are spoken. Text longer than the endpoint's 1000 character limit is split on sentence boundaries and rejoined.",
    example: '🔤 Input: Devanagari "धन्यवाद"\n📖 Output: Latin script "Dhanyavaad"',
    icon: <Languages className="h-5 w-5 text-emerald-600" />,
    iconBg: 'bg-emerald-50',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800'
  },
  {
    id: 'language_detect',
    title: 'Detect Language',
    category: 'Regional',
    desc: 'Identifies the language and the script of incoming text, and passes the text through unchanged.',
    significance: 'Reporting the script is what separates Romanised Indic input from English — "meeru ela unnaru" is Telugu written in Latin, not an English sentence. That distinction is the basis for handling mixed-language input correctly.',
    howToUse: 'Place it before a branch. Follow it with a Router set to match the language_code or script_code field to send each language down its own path.',
    internalWorking: "Calls Sarvam's /text-lid endpoint with the first 1000 characters, which is a sample rather than the whole document because more text does not improve the answer. Returns language_code in BCP-47 form and script_code such as Deva, Latn or Telu, alongside the original text so the chain continues uninterrupted.",
    example: '🔤 Input: "meeru ela unnaru"\n📖 Output: language_code te-IN, script_code Latn',
    icon: <Languages className="h-5 w-5 text-emerald-600" />,
    iconBg: 'bg-emerald-50',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800'
  },
  {
    id: 'codemix_normalizer',
    title: 'Code-Mix Cleaner',
    category: 'Regional',
    desc: 'Cleans up multi-lingual spoken slang (like Hinglish or Tenglish) into formal language.',
    significance: 'Normalizes informal Indian speech text for better compatibility with standard translation and LLM models.',
    howToUse: 'Input code-mixed transcripts. Connect its output to standard LLM or Translate nodes.',
    internalWorking: 'Employs specialized instruction-tuned models to strip colloquial slang, correct mixed-script typos, and produce grammatically pristine Unicode sentences.',
    example: '🧹 Input: "merko call back chahiye urgent"\n🇮🇳 Output: "मुझे तत्काल कॉल बैक की आवश्यकता है।"',
    icon: <Smile className="h-5 w-5 text-emerald-600" />,
    iconBg: 'bg-emerald-50',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800'
  },

  // --- RAG ---
  {
    id: 'pdf_splitter',
    title: 'Document Chunker',
    category: 'RAG',
    desc: 'Splits raw text or document outputs into smaller, semantically coherent chunks.',
    significance: 'Necessary for document indexing to fit within LLM context limits and database vector stores.',
    howToUse: 'Configure chunk size and overlap parameters. Connect Document Input to Chunker.',
    internalWorking: 'Tokenizes and slices incoming text layouts using overlap ratios, producing an array of semantic text blocks packaged as a JSON list payload.',
    example: '✂️ Input: 2,000 words article\n📦 Output: 4 chunks of 500 words each (with 50-word overlap) for semantic processing.',
    icon: <FileText className="h-5 w-5 text-cyan-600" />,
    iconBg: 'bg-cyan-50',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-800'
  },
  {
    id: 'vector_search',
    title: 'Vector Query',
    category: 'RAG',
    desc: 'Retrieves relevant semantic text chunks matching a prompt query.',
    significance: 'Retrieves localized knowledge bases in real-time, forming the core of custom knowledge QA bots.',
    howToUse: 'Define connection queries and vector database endpoints. Connect to a Chunker or LLM context.',
    internalWorking: 'Computes text embeddings of the search query, performs cosine similarity searches on pre-indexed document collections, and returns the top matching text snippets.',
    example: '🔍 Input Query: "What are check-in timings?"\n📚 Output: Retrieves chunk #3: "Check-in time is 2:00 PM and checkout is 11:00 AM."',
    icon: <Key className="h-5 w-5 text-cyan-600" />,
    iconBg: 'bg-cyan-50',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-800'
  },

  // --- CONNECTORS ---
  {
    id: 'webhook',
    title: 'Webhook Dispatcher',
    category: 'Connectors',
    desc: 'Triggers external API endpoints with pipeline execution outputs.',
    significance: 'Integrates Pravah flows with Slack, Discord, custom CRM tools, or databases.',
    howToUse: 'Input a valid HTTP POST URL, configure request headers (JSON), and choose what data payload fields to transmit.',
    internalWorking: 'Sends an asynchronous outgoing HTTP request containing a structured JSON body of the current execution state to the configured endpoint, handling success and retry logs.',
    example: '🔗 URL: "https://hooks.slack.com/services/..."\n📤 Output: Sends POST payload containing completed translation logs to Slack.',
    icon: <LinkIcon className="h-5 w-5 text-pink-600" />,
    iconBg: 'bg-pink-50',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-800'
  },

  // --- OUTPUTS ---
  {
    id: 'text_output',
    title: 'Text Output Console',
    category: 'Output',
    desc: 'Renders final text results inside the visual execution dashboard.',
    significance: 'Displays translations, transcripts, summaries, and model reasoning results instantly.',
    howToUse: 'Simply connect the output of any text-based processing node (Translate, STT, LLM) to its input handle.',
    internalWorking: 'Catches the incoming string data from the execution runner and maps it directly to the UI rendering state to show real-time changes inside the execution console.',
    example: '🖥️ Input: "प्रवाह में आपका स्वागत है।"\n📺 Output: Text appears rendered in the dashboard console card.',
    icon: <Monitor className="h-5 w-5 text-indigo-600" />,
    iconBg: 'bg-indigo-50',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800'
  },
  {
    id: 'audio_output',
    title: 'Audio Playback Console',
    category: 'Output',
    desc: 'Streams synthesized voice files and provides an on-screen audio player.',
    significance: 'Allows users to listen to translated voiceovers, audiobooks, or podcast executions.',
    howToUse: 'Connect the output of the TTS or Podcast node to its input handle.',
    internalWorking: 'Loads the R2 public CDN URL passed from the TTS nodes and embeds a responsive HTML5 audio player component directly in the visual dashboard.',
    example: '🔈 Input: "https://r2.pravah.com/out_123.wav"\n▶️ Output: Play/Pause audio bar rendered on the dashboard execution sidebar.',
    icon: <PlayCircle className="h-5 w-5 text-indigo-600" />,
    iconBg: 'bg-indigo-50',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800'
  }
];

export default function NodeGuidePage() {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['All', 'Input', 'Processing', 'Logic', 'Regional', 'RAG', 'Connectors', 'Output'];

  const filteredDocs = nodeDocs.filter(doc => {
    const matchesCategory = activeCategory === 'All' || doc.category === activeCategory;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.significance.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50/40 flex flex-col font-sans relative overflow-hidden">
      {/* Background blurs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/30 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-50/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Projects
          </Link>
        </div>

        {/* Documentation Page Header */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50/30 via-indigo-50/10 to-purple-50/30 border border-gray-200/80 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
                PIPELINE BUILDING MANUAL
              </span>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                Pravah Node Reference Guide
              </h1>
              <p className="text-xs text-gray-500 max-w-2xl">
                Explore the technical significance, configuration details, and internal API mechanics for every node available on the Pravah editor canvas.
              </p>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search nodes or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-9 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-transparent transition-all"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 mt-6 pt-5 border-t border-gray-200/50">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Node Documentation Listing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.length === 0 ? (
            <div className="col-span-full py-16 text-center border border-dashed border-gray-200 rounded-2xl bg-white/50">
              <HelpCircle className="mx-auto h-8 w-8 text-gray-300 mb-3" />
              <h3 className="text-sm font-medium text-gray-900">No nodes found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                No pipeline nodes matched your current filter or search queries. Try adjusting your parameters.
              </p>
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div 
                key={doc.id} 
                className="rounded-2xl border border-gray-200/80 bg-white p-5 flex flex-col justify-between hover:shadow-md transition-all space-y-4 relative overflow-hidden"
              >
                <div className="space-y-4">
                  
                  {/* Icon & Category Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${doc.iconBg}`}>
                        {doc.icon}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm">{doc.title}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${doc.badgeBg} ${doc.badgeText}`}>
                      {doc.category}
                    </span>
                  </div>

                  {/* Node Short Description */}
                  <p className="text-xs text-gray-500 leading-normal border-b border-gray-100 pb-3">
                    {doc.desc}
                  </p>

                  {/* Detail items */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-[10px] uppercase tracking-wider font-semibold text-blue-600 flex items-center gap-1.5">
                        <Shield className="h-3 w-3" /> Significance
                      </h4>
                      <p className="text-xs text-gray-600 leading-relaxed font-normal">
                        {doc.significance}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 flex items-center gap-1.5">
                        <Cpu className="h-3 w-3" /> How to configure & use
                      </h4>
                      <p className="text-xs text-gray-600 leading-relaxed font-normal">
                        {doc.howToUse}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-[10px] uppercase tracking-wider font-semibold text-purple-600 flex items-center gap-1.5">
                        <Zap className="h-3 w-3" /> Internal Execution Logic
                      </h4>
                      <p className="text-xs text-gray-600 leading-relaxed font-normal">
                        {doc.internalWorking}
                      </p>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-gray-100">
                      <h4 className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 flex items-center gap-1.5">
                        <ClipboardList className="h-3 w-3" /> Practical Example
                      </h4>
                      <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200/50 text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap font-mono">
                        {doc.example}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
