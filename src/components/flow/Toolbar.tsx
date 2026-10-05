'use client';

import React, { useState, useRef } from 'react';
import { 
  Mic, Languages, Volume2, 
  FileText, Image, Video, Link as LinkIcon, 
  Brain, AlignLeft, Smile, Key, Tags, 
  Monitor, PlayCircle, Download, Mail, FileAudio, Keyboard,
  Undo2, Redo2, Search, Sparkles, LayoutGrid, Upload, Trash2, HelpCircle, Terminal, Zap
} from 'lucide-react';
import { NodeType } from '@/types/pipeline';
import { usePipelineStore } from '@/store/pipelineStore';
import { TemplatesModal } from './TemplatesModal';
import { ShortcutsModal } from './ShortcutsModal';
import { DeployApiModal } from './DeployApiModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ToolbarItem {
  type: NodeType;
  title: string;
  desc: string;
  icon: React.ReactNode;
  bg: string;
  hover: string;
}

const inputNodes: ToolbarItem[] = [
  { type: 'audio_input', title: 'Audio', desc: 'Upload voice recordings (WAV/MP3) as the source for your pipeline.', icon: <FileAudio className="h-3.5 w-3.5 text-pink-600" />, bg: 'bg-pink-50', hover: 'hover:border-pink-200 hover:bg-pink-50/50' },
  { type: 'text_input', title: 'Text', desc: 'Input static text prompts or raw text blocks.', icon: <Keyboard className="h-3.5 w-3.5 text-pink-600" />, bg: 'bg-pink-50', hover: 'hover:border-pink-200 hover:bg-pink-50/50' },
  { type: 'document_input', title: 'Document', desc: 'Source PDF, DOCX, or text files for text extraction.', icon: <FileText className="h-3.5 w-3.5 text-pink-600" />, bg: 'bg-pink-50', hover: 'hover:border-pink-200 hover:bg-pink-50/50' },
  { type: 'image_input', title: 'Image', desc: 'Provide images for OCR processing or optical analysis.', icon: <Image className="h-3.5 w-3.5 text-pink-600" />, bg: 'bg-pink-50', hover: 'hover:border-pink-200 hover:bg-pink-50/50' },
  { type: 'video_input', title: 'Video', desc: 'Input video files for subtitle generation and transcription.', icon: <Video className="h-3.5 w-3.5 text-pink-600" />, bg: 'bg-pink-50', hover: 'hover:border-pink-200 hover:bg-pink-50/50' },
  { type: 'url_input', title: 'URL', desc: 'Scrape content from public web URLs.', icon: <LinkIcon className="h-3.5 w-3.5 text-pink-600" />, bg: 'bg-pink-50', hover: 'hover:border-pink-200 hover:bg-pink-50/50' },
];

const processingNodes: ToolbarItem[] = [
  { type: 'stt', title: 'STT', desc: 'Transcribe spoken regional language audio to text using Sarvam AI Saaras:v3.', icon: <Mic className="h-3.5 w-3.5 text-emerald-600" />, bg: 'bg-emerald-50', hover: 'hover:border-emerald-200 hover:bg-emerald-50/50' },
  { type: 'translate', title: 'Translate', desc: 'Translate text between supported Indic languages (Hindi, Telugu, Tamil, etc.).', icon: <Languages className="h-3.5 w-3.5 text-blue-600" />, bg: 'bg-blue-50', hover: 'hover:border-blue-200 hover:bg-blue-50/50' },
  { type: 'tts', title: 'TTS', desc: 'Synthesize natural voice audio from text using Sarvam AI Bulbul:v3.', icon: <Volume2 className="h-3.5 w-3.5 text-orange-600" />, bg: 'bg-orange-50', hover: 'hover:border-orange-200 hover:bg-orange-50/50' },
  { type: 'podcast', title: 'Podcast', desc: 'Generates a 2-speaker conversational dialogue on a topic with distinct perspectives.', icon: <PlayCircle className="h-3.5 w-3.5 text-rose-600" />, bg: 'bg-rose-50', hover: 'hover:border-rose-200 hover:bg-rose-50/50' },
  { type: 'ocr', title: 'OCR', desc: 'Extract text from an image or PDF exactly as written, using Sarvam Document AI.', icon: <FileText className="h-3.5 w-3.5 text-purple-600" />, bg: 'bg-purple-50', hover: 'hover:border-purple-200 hover:bg-purple-50/50' },
  { type: 'llm', title: 'LLM', desc: 'Query a large language model (e.g. Gemini) for generative responses.', icon: <Brain className="h-3.5 w-3.5 text-purple-600" />, bg: 'bg-purple-50', hover: 'hover:border-purple-200 hover:bg-purple-50/50' },
  { type: 'summarize', title: 'Summarize', desc: 'Automatically compress texts into condensed takeaways.', icon: <AlignLeft className="h-3.5 w-3.5 text-purple-600" />, bg: 'bg-purple-50', hover: 'hover:border-purple-200 hover:bg-purple-50/50' },
  { type: 'sentiment', title: 'Sentiment', desc: 'Classify text polarity (Positive, Neutral, Negative).', icon: <Smile className="h-3.5 w-3.5 text-purple-600" />, bg: 'bg-purple-50', hover: 'hover:border-purple-200 hover:bg-purple-50/50' },
  { type: 'keyword_extraction', title: 'Keywords', desc: 'Identify core keywords and concepts inside documents.', icon: <Key className="h-3.5 w-3.5 text-purple-600" />, bg: 'bg-purple-50', hover: 'hover:border-purple-200 hover:bg-purple-50/50' },
  { type: 'classification', title: 'Classify', desc: 'Sort target files or strings into custom defined tags.', icon: <Tags className="h-3.5 w-3.5 text-purple-600" />, bg: 'bg-purple-50', hover: 'hover:border-purple-200 hover:bg-purple-50/50' },
];

const outputNodes: ToolbarItem[] = [
  { type: 'text_output', title: 'Text Out', desc: 'Display translated or transcribed text directly on the visual dashboard.', icon: <Monitor className="h-3.5 w-3.5 text-indigo-600" />, bg: 'bg-indigo-50', hover: 'hover:border-indigo-200 hover:bg-indigo-50/50' },
  { type: 'audio_output', title: 'Audio Out', desc: 'Stream synthesized voice recordings and play them back on screen.', icon: <PlayCircle className="h-3.5 w-3.5 text-indigo-600" />, bg: 'bg-indigo-50', hover: 'hover:border-indigo-200 hover:bg-indigo-50/50' },
  { type: 'file_output', title: 'File Out', desc: 'Save output results to a downloadable text or audio file.', icon: <Download className="h-3.5 w-3.5 text-indigo-600" />, bg: 'bg-indigo-50', hover: 'hover:border-indigo-200 hover:bg-indigo-50/50' },
];

const logicNodes: ToolbarItem[] = [
  { type: 'router', title: 'Router', desc: 'Directs the execution flow down a specific path based on condition values.', icon: <Brain className="h-3.5 w-3.5 text-rose-600" />, bg: 'bg-rose-50', hover: 'hover:border-rose-200 hover:bg-rose-50/50' },
  { type: 'delay', title: 'Delay', desc: 'Pauses pipeline execution for a configured duration in seconds.', icon: <PlayCircle className="h-3.5 w-3.5 text-rose-600" />, bg: 'bg-rose-50', hover: 'hover:border-rose-200 hover:bg-rose-50/50' },
];

const ragNodes: ToolbarItem[] = [
  { type: 'pdf_splitter', title: 'Chunker', desc: 'Splits raw text or document outputs into smaller chunks.', icon: <FileText className="h-3.5 w-3.5 text-cyan-600" />, bg: 'bg-cyan-50', hover: 'hover:border-cyan-200 hover:bg-cyan-50/50' },
  { type: 'vector_search', title: 'Retrieve', desc: 'Returns the document chunks containing the most words from your query. Keyword matching, not embeddings.', icon: <Key className="h-3.5 w-3.5 text-cyan-600" />, bg: 'bg-cyan-50', hover: 'hover:border-cyan-200 hover:bg-cyan-50/50' },
];

const regionalNodes: ToolbarItem[] = [
  { type: 'transliteration', title: 'Transliterate', desc: 'Converts text between Indic scripts and Roman phonetically, using Sarvam\'s transliteration model.', icon: <Languages className="h-3.5 w-3.5 text-emerald-600" />, bg: 'bg-emerald-50', hover: 'hover:border-emerald-200 hover:bg-emerald-50/50' },
  { type: 'language_detect', title: 'Detect Language', desc: 'Identifies the language and script of incoming text, so a branch can route on Romanised or mixed-script input.', icon: <Languages className="h-3.5 w-3.5 text-emerald-600" />, bg: 'bg-emerald-50', hover: 'hover:border-emerald-200 hover:bg-emerald-50/50' },
  { type: 'codemix_normalizer', title: 'Code-Mix Cleaner', desc: 'Cleans up multi-lingual spoken slang (like Hinglish/Tenglish) into formal language.', icon: <Smile className="h-3.5 w-3.5 text-emerald-600" />, bg: 'bg-emerald-50', hover: 'hover:border-emerald-200 hover:bg-emerald-50/50' },
];

const connectorNodes: ToolbarItem[] = [
  { type: 'webhook', title: 'Webhook', desc: 'Triggers external API webhook endpoints with execution results.', icon: <LinkIcon className="h-3.5 w-3.5 text-pink-600" />, bg: 'bg-pink-50', hover: 'hover:border-pink-200 hover:bg-pink-50/50' },
  { type: 'sms_sender', title: 'SMS Sender', desc: 'Sends outbound text messages with transcripts or alerts.', icon: <Mail className="h-3.5 w-3.5 text-pink-600" />, bg: 'bg-pink-50', hover: 'hover:border-pink-200 hover:bg-pink-50/50' },
];

interface HoveredTooltip {
  id: string;
  rect: DOMRect;
  desc: string;
}

export const Toolbar: React.FC = () => {
  const addNode = usePipelineStore((s) => s.addNode);
  const setHoveredNodeType = usePipelineStore((s) => s.setHoveredNodeType);
  const undo = usePipelineStore((s) => s.undo);
  const redo = usePipelineStore((s) => s.redo);
  const canUndo = usePipelineStore((s) => s.canUndo);
  const canRedo = usePipelineStore((s) => s.canRedo);
  const setCommandPaletteOpen = usePipelineStore((s) => s.setCommandPaletteOpen);
  const applyAutoLayout = usePipelineStore((s) => s.applyAutoLayout);
  const clearCanvas = usePipelineStore((s) => s.clearCanvas);
  const importPipelineData = usePipelineStore((s) => s.importPipelineData);
  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const pipelineName = usePipelineStore((s) => s.pipelineName);
  const pipelineId = usePipelineStore((s) => s.pipelineId);

  const [tooltip, setTooltip] = useState<HoveredTooltip | null>(null);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isDeployApiModalOpen, setIsDeployApiModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
    setTooltip(null);
    setHoveredNodeType(null);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, item: ToolbarItem) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      id: item.type,
      rect,
      desc: item.desc,
    });
    setHoveredNodeType(item.type);
  };

  const handleMouseLeave = () => {
    setTooltip(null);
    setHoveredNodeType(null);
  };

  const handleExportJSON = () => {
    const data = {
      name: pipelineName || 'Pravah Pipeline',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes,
      edges,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(pipelineName || 'pipeline').toLowerCase().replace(/\s+/g, '-')}-flow.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          importPipelineData({
            name: parsed.name,
            nodes: parsed.nodes,
            edges: parsed.edges,
          });
        } else {
          alert('Invalid pipeline JSON format. Must contain "nodes" and "edges" arrays.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const renderNodeGroup = (title: string, nodesList: ToolbarItem[]) => (
    <div className="flex items-center gap-2 px-3 py-1 border-r border-gray-200 last:border-r-0">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider shrink-0 mr-1 select-none">{title}</span>
      <div className="flex items-center gap-1.5">
        {nodesList.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => handleDragStart(e, item.type)}
            onMouseEnter={(e) => handleMouseEnter(e, item)}
            onMouseLeave={handleMouseLeave}
            onClick={() => {
              addNode(item.type, {
                x: 220 + Math.random() * 60,
                y: 120 + Math.random() * 60,
              });
              setTooltip(null);
            }}
            className={`flex items-center justify-center h-8 px-2.5 rounded-md border border-gray-100 bg-white cursor-grab active:cursor-grabbing transition-all shrink-0 shadow-xs gap-1.5 ${item.hover}`}
          >
            <div className={`p-1 rounded ${item.bg}`}>
              {item.icon}
            </div>
            <span className="text-xs font-medium text-gray-700 whitespace-nowrap select-none">{item.title}</span>
          </div>
        ))}
      </div>
    </div>
  );

  let tooltipLeft = 0;
  let caretLeftOffset = 104;
  if (tooltip) {
    const center = tooltip.rect.left + (tooltip.rect.width / 2) - 104;
    const maxLeft = typeof window !== 'undefined' ? window.innerWidth - 216 : 1000;
    tooltipLeft = Math.max(8, Math.min(center, maxLeft));
    caretLeftOffset = (tooltip.rect.left + (tooltip.rect.width / 2)) - tooltipLeft;
  }

  return (
    <>
      <div className="w-full h-14 bg-gray-50/80 backdrop-blur-md border-b border-gray-200 flex items-center overflow-x-auto px-2 shrink-0 z-20 gap-1">
        {/* Quick Productivity Controls (Search, Templates, AutoLayout, Undo, Redo) */}
        <div className="flex items-center gap-1 px-2 py-1 border-r border-gray-200 shrink-0">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            title="Quick Search & Insert Nodes (⌘K)"
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-indigo-50/80 border border-indigo-200/80 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-all text-xs font-medium shadow-2xs cursor-pointer select-none"
          >
            <Search className="h-3.5 w-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Add Node</span>
            <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-white text-indigo-700 border border-indigo-200 shadow-2xs ml-0.5">⌘K</kbd>
          </button>

          <button
            onClick={() => setIsTemplatesModalOpen(true)}
            title="Choose a Pre-Built Workflow Template"
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all text-xs font-medium shadow-2xs cursor-pointer select-none"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          <button
            onClick={applyAutoLayout}
            disabled={nodes.length === 0}
            title="Auto-Layout / Tidy DAG"
            className={`flex items-center gap-1.5 h-8 px-2 rounded-md border transition-all text-xs font-medium ${
              nodes.length > 0
                ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 cursor-pointer shadow-2xs'
                : 'bg-gray-100/60 border-gray-200/60 text-gray-300 cursor-not-allowed opacity-50'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5 text-gray-500" />
            <span className="hidden lg:inline">Tidy</span>
          </button>

          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            className={`flex items-center justify-center h-8 w-8 rounded-md border transition-all ${
              canUndo
                ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100 cursor-pointer shadow-2xs'
                : 'bg-gray-100/60 border-gray-200/60 text-gray-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
            className={`flex items-center justify-center h-8 w-8 rounded-md border transition-all ${
              canRedo
                ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100 cursor-pointer shadow-2xs'
                : 'bg-gray-100/60 border-gray-200/60 text-gray-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {renderNodeGroup('Inputs', inputNodes)}
        {renderNodeGroup('Processing', processingNodes)}
        {renderNodeGroup('Logic', logicNodes)}
        {renderNodeGroup('RAG', ragNodes)}
        {renderNodeGroup('Regional', regionalNodes)}
        {renderNodeGroup('Connectors', connectorNodes)}
        {renderNodeGroup('Outputs', outputNodes)}

        {/* Workflow Tools (Deploy API, Export, Import, Clear, Shortcuts) */}
        <div className="flex items-center gap-1.5 px-2 py-1 border-l border-gray-200 shrink-0 ml-auto">
          <button
            onClick={() => setIsDeployApiModalOpen(true)}
            title="Deploy Pipeline as REST API (cURL, Python, Node.js)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer mr-0.5"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Deploy API</span>
          </button>

          <button
            onClick={handleExportJSON}
            disabled={nodes.length === 0}
            title="Export Workflow as JSON"
            className={`flex items-center justify-center h-8 w-8 rounded-md border transition-all ${
              nodes.length > 0
                ? 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer shadow-2xs'
                : 'bg-gray-100/60 border-gray-200/60 text-gray-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          <label
            title="Import Workflow from JSON"
            className="flex items-center justify-center h-8 w-8 rounded-md border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer shadow-2xs transition-all"
          >
            <Upload className="h-3.5 w-3.5" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setIsClearConfirmOpen(true)}
            disabled={nodes.length === 0 && edges.length === 0}
            title="Clear Canvas"
            className={`flex items-center justify-center h-8 w-8 rounded-md border transition-all ${
              nodes.length > 0 || edges.length > 0
                ? 'bg-white border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200 cursor-pointer shadow-2xs'
                : 'bg-gray-100/60 border-gray-200/60 text-gray-300 cursor-not-allowed opacity-50'
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            title="Keyboard Shortcuts (? or ⌘/)"
            className="flex items-center justify-center h-8 w-8 rounded-md border bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 cursor-pointer shadow-2xs transition-all"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Viewport Fixed Tooltip Overlay */}
        {tooltip && (
          <div 
            className="fixed z-50 w-52 p-2.5 rounded-xl bg-gray-950/95 text-[10px] text-white/95 leading-normal shadow-lg backdrop-blur-xs border border-white/5 pointer-events-none tooltip-fade"
            style={{
              top: `${tooltip.rect.bottom + 8}px`,
              left: `${tooltipLeft}px`,
            }}
          >
            {tooltip.desc}
            <div 
              className="absolute -top-1 w-2 h-2 bg-gray-950 rotate-45 border-t border-l border-white/5" 
              style={{ left: `${caretLeftOffset - 4}px` }} 
            />
          </div>
        )}
      </div>

      <DeployApiModal
        isOpen={isDeployApiModalOpen}
        onClose={() => setIsDeployApiModalOpen(false)}
        pipelineId={pipelineId || ''}
      />

      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        title="Clear Entire Canvas?"
        message="Are you sure you want to remove all nodes and edges from this canvas? (You can still undo this with ⌘Z)."
        confirmText="Clear Canvas"
        onConfirm={() => {
          clearCanvas();
          setIsClearConfirmOpen(false);
        }}
        onCancel={() => setIsClearConfirmOpen(false)}
      />
    </>
  );
};

