'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, X, Mic, Languages, Volume2, PlayCircle, FileText, Brain,
  AlignLeft, Smile, Key, Tags, Monitor, Download, Mail, FileAudio,
  Keyboard, Image, Video, Link as LinkIcon, Sparkles, Command, CornerDownLeft
} from 'lucide-react';
import { NodeType } from '@/types/pipeline';
import { usePipelineStore } from '@/store/pipelineStore';

export interface CommandPaletteNodeItem {
  type: NodeType;
  title: string;
  category: 'Inputs' | 'Processing' | 'Logic' | 'RAG' | 'Regional' | 'Connectors' | 'Outputs';
  desc: string;
  icon: React.ReactNode;
  badgeBg: string;
  badgeText: string;
}

export const PALETTE_NODES: CommandPaletteNodeItem[] = [
  // Inputs
  { type: 'audio_input', title: 'Audio Input', category: 'Inputs', desc: 'Upload voice recordings (WAV/MP3) as the pipeline source.', icon: <FileAudio className="h-4 w-4 text-pink-600" />, badgeBg: 'bg-pink-100', badgeText: 'text-pink-700' },
  { type: 'text_input', title: 'Text Input', category: 'Inputs', desc: 'Input static text prompts, system messages, or raw text blocks.', icon: <Keyboard className="h-4 w-4 text-pink-600" />, badgeBg: 'bg-pink-100', badgeText: 'text-pink-700' },
  { type: 'document_input', title: 'Document Input', category: 'Inputs', desc: 'Source PDF, DOCX, or text files for text extraction.', icon: <FileText className="h-4 w-4 text-pink-600" />, badgeBg: 'bg-pink-100', badgeText: 'text-pink-700' },
  { type: 'image_input', title: 'Image Input', category: 'Inputs', desc: 'Provide images for OCR processing or optical analysis.', icon: <Image className="h-4 w-4 text-pink-600" />, badgeBg: 'bg-pink-100', badgeText: 'text-pink-700' },
  { type: 'video_input', title: 'Video Input', category: 'Inputs', desc: 'Input video files for subtitle generation and transcription.', icon: <Video className="h-4 w-4 text-pink-600" />, badgeBg: 'bg-pink-100', badgeText: 'text-pink-700' },
  { type: 'url_input', title: 'URL Input', category: 'Inputs', desc: 'Fetch web articles and public URL content.', icon: <LinkIcon className="h-4 w-4 text-pink-600" />, badgeBg: 'bg-pink-100', badgeText: 'text-pink-700' },

  // Processing
  { type: 'stt', title: 'Speech to Text (Saaras)', category: 'Processing', desc: 'Transcribe spoken Indic audio to text using Sarvam AI Saaras:v3.', icon: <Mic className="h-4 w-4 text-emerald-600" />, badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700' },
  { type: 'translate', title: 'Translate (Mayura)', category: 'Processing', desc: 'Translate text between 22+ Indic languages (Hindi, Telugu, Tamil, etc.).', icon: <Languages className="h-4 w-4 text-blue-600" />, badgeBg: 'bg-blue-100', badgeText: 'text-blue-700' },
  { type: 'tts', title: 'Text to Speech (Bulbul)', category: 'Processing', desc: 'Synthesize natural voice audio from text using Sarvam AI Bulbul:v3.', icon: <Volume2 className="h-4 w-4 text-orange-600" />, badgeBg: 'bg-orange-100', badgeText: 'text-orange-700' },
  { type: 'podcast', title: 'Podcast Generator', category: 'Processing', desc: 'Generates a 2-speaker conversational dialogue with distinct perspectives.', icon: <PlayCircle className="h-4 w-4 text-rose-600" />, badgeBg: 'bg-rose-100', badgeText: 'text-rose-700' },
  { type: 'ocr', title: 'OCR & Document AI', category: 'Processing', desc: 'Extract text from scanned images and PDFs with high Indic fidelity.', icon: <FileText className="h-4 w-4 text-purple-600" />, badgeBg: 'bg-purple-100', badgeText: 'text-purple-700' },
  { type: 'llm', title: 'Large Language Model', category: 'Processing', desc: 'Query Sarvam-105B or Gemini models for generative tasks.', icon: <Brain className="h-4 w-4 text-purple-600" />, badgeBg: 'bg-purple-100', badgeText: 'text-purple-700' },
  { type: 'summarize', title: 'Summarize Text', category: 'Processing', desc: 'Compress lengthy transcripts into key actionable takeaways.', icon: <AlignLeft className="h-4 w-4 text-purple-600" />, badgeBg: 'bg-purple-100', badgeText: 'text-purple-700' },
  { type: 'sentiment', title: 'Sentiment Analysis', category: 'Processing', desc: 'Classify text polarity into positive, neutral, or negative.', icon: <Smile className="h-4 w-4 text-purple-600" />, badgeBg: 'bg-purple-100', badgeText: 'text-purple-700' },
  { type: 'keyword_extraction', title: 'Keyword Extraction', category: 'Processing', desc: 'Identify core topics, entities, and keywords inside documents.', icon: <Key className="h-4 w-4 text-purple-600" />, badgeBg: 'bg-purple-100', badgeText: 'text-purple-700' },
  { type: 'classification', title: 'Text Classification', category: 'Processing', desc: 'Sort customer queries or documents into custom defined categories.', icon: <Tags className="h-4 w-4 text-purple-600" />, badgeBg: 'bg-purple-100', badgeText: 'text-purple-700' },

  // Logic
  { type: 'router', title: 'Conditional Router', category: 'Logic', desc: 'Directs flow execution down specific branches based on rules or thresholds.', icon: <Brain className="h-4 w-4 text-rose-600" />, badgeBg: 'bg-rose-100', badgeText: 'text-rose-700' },
  { type: 'delay', title: 'Execution Delay', category: 'Logic', desc: 'Pauses pipeline execution for a specified duration in seconds.', icon: <PlayCircle className="h-4 w-4 text-rose-600" />, badgeBg: 'bg-rose-100', badgeText: 'text-rose-700' },

  // RAG
  { type: 'pdf_splitter', title: 'Document Chunker', category: 'RAG', desc: 'Splits raw text and documents into overlapping semantic chunks.', icon: <FileText className="h-4 w-4 text-cyan-600" />, badgeBg: 'bg-cyan-100', badgeText: 'text-cyan-700' },
  { type: 'vector_search', title: 'Vector Search / Retrieve', category: 'RAG', desc: 'Finds and retrieves the most relevant document chunks matching a query.', icon: <Key className="h-4 w-4 text-cyan-600" />, badgeBg: 'bg-cyan-100', badgeText: 'text-cyan-700' },

  // Regional
  { type: 'transliteration', title: 'Transliterate', category: 'Regional', desc: 'Phonetically converts text between Indic scripts and Roman English.', icon: <Languages className="h-4 w-4 text-emerald-600" />, badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700' },
  { type: 'language_detect', title: 'Detect Language', category: 'Regional', desc: 'Identifies the language and script of incoming multilingual text.', icon: <Languages className="h-4 w-4 text-emerald-600" />, badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700' },
  { type: 'codemix_normalizer', title: 'Code-Mix Cleaner', category: 'Regional', desc: 'Cleans up multi-lingual spoken slang (Hinglish/Tenglish) into formal language.', icon: <Smile className="h-4 w-4 text-emerald-600" />, badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700' },

  // Connectors
  { type: 'webhook', title: 'Outgoing Webhook', category: 'Connectors', desc: 'Triggers external REST API endpoints with pipeline results.', icon: <LinkIcon className="h-4 w-4 text-pink-600" />, badgeBg: 'bg-pink-100', badgeText: 'text-pink-700' },
  { type: 'sms_sender', title: 'SMS Sender', category: 'Connectors', desc: 'Sends outbound alerts and SMS messages with processed text.', icon: <Mail className="h-4 w-4 text-pink-600" />, badgeBg: 'bg-pink-100', badgeText: 'text-pink-700' },

  // Outputs
  { type: 'text_output', title: 'Text Output', category: 'Outputs', desc: 'Displays translated or formatted text in the visual dashboard.', icon: <Monitor className="h-4 w-4 text-indigo-600" />, badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700' },
  { type: 'audio_output', title: 'Audio Output', category: 'Outputs', desc: 'Streams synthesized voice recordings for playback in the dashboard.', icon: <PlayCircle className="h-4 w-4 text-indigo-600" />, badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700' },
  { type: 'file_output', title: 'File Output', category: 'Outputs', desc: 'Generates downloadable output files (audio/text).', icon: <Download className="h-4 w-4 text-indigo-600" />, badgeBg: 'bg-indigo-100', badgeText: 'text-indigo-700' },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (type: NodeType) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectNode,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredNodes = useMemo(() => {
    if (!query.trim()) return PALETTE_NODES;
    const q = query.toLowerCase().trim();
    return PALETTE_NODES.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.desc.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredNodes.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredNodes.length) % Math.max(1, filteredNodes.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredNodes[selectedIndex]) {
        onSelectNode(filteredNodes[selectedIndex].type);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[540px] animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-gray-100 gap-3 bg-gray-50/50">
          <Search className="h-5 w-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes by name, capability, or category... (e.g. Translate, STT, Podcast)"
            className="flex-1 bg-transparent border-0 outline-none text-sm text-gray-800 placeholder-gray-400 focus:ring-0"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200/50"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-2xs">
            <kbd>ESC</kbd>
          </div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 divide-y divide-gray-50">
          {filteredNodes.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <p>No nodes matching &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-gray-400 mt-1">Try searching for &quot;audio&quot;, &quot;translate&quot;, &quot;llm&quot;, or &quot;router&quot;</p>
            </div>
          ) : (
            filteredNodes.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.type}
                  data-index={index}
                  onClick={() => {
                    onSelectNode(item.type);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected ? 'bg-indigo-50/80 border border-indigo-200/60 shadow-xs' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-white border border-gray-100 shadow-2xs shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-800 tracking-tight">
                        {item.title}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.badgeBg} ${item.badgeText}`}>
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 leading-normal">
                      {item.desc}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="shrink-0 self-center flex items-center gap-1 text-[11px] text-indigo-600 font-medium bg-white px-2 py-1 rounded-md border border-indigo-100 shadow-2xs">
                      <span>Insert</span>
                      <CornerDownLeft className="h-3 w-3" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 font-mono text-[10px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-200 font-mono text-[10px]">↵</kbd>
              Insert Node
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>Pravah AI Engine</span>
            <Sparkles className="h-3 w-3 text-indigo-500" />
          </div>
        </div>
      </div>
    </div>
  );
};
