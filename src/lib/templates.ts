import { Node, Edge } from '@xyflow/react';
import { NodeType } from '@/types/pipeline';

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  category: 'support' | 'healthcare' | 'media' | 'audio' | 'document' | 'podcast' | 'analytics';
  categoryLabel: string;
  icon: string;
  badge: string;
  tags: string[];
  estimatedCost: string;
  estimatedLatency: string;
  languagesSupported: string[];
  nodes: {
    id: string;
    type: NodeType;
    label: string;
    config: Record<string, any>;
  }[];
  edges: {
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }[];
}

export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    id: 'hindi-whatsapp-voice-bot',
    name: '💬 Hindi WhatsApp Customer Voice Bot',
    description: 'Autonomous customer support agent for WhatsApp & IVR. Transcribes incoming Hindi audio/text queries via Saaras, runs intent classification & FAQ resolution with Indic LLM, and responds with natural Hindi voice using Bulbul TTS.',
    category: 'support',
    categoryLabel: 'Customer Support',
    icon: 'MessageSquare',
    badge: 'Signature',
    tags: ['WhatsApp', 'Customer Support', 'Hindi Voice', 'IVR', 'Sarvam STT/TTS'],
    estimatedCost: '₹0.45 / call',
    estimatedLatency: '1.2s',
    languagesSupported: ['Hindi (hi-IN)', 'Hinglish'],
    nodes: [
      { id: 'node-input-audio', type: 'audio_input', label: 'WhatsApp Audio In', config: { input_type: 'upload' } },
      { id: 'node-stt-hindi', type: 'stt', label: 'Saaras v3 STT', config: { language_code: 'hi-IN', model: 'saaras:v3', mode: 'transcribe' } },
      { id: 'node-llm-intent', type: 'llm', label: 'Support Intent & FAQ Agent', config: { system_prompt: 'You are an empathetic, concise customer support agent for an Indian retail brand. Reply helpfully in clean Hindi.' } },
      { id: 'node-tts-hindi', type: 'tts', label: 'Bulbul TTS (Hindi)', config: { target_language_code: 'hi-IN', speaker: 'aditya', pace: 1.0, model: 'bulbul:v3' } },
      { id: 'node-output-audio', type: 'audio_output', label: 'WhatsApp Voice Out', config: {} },
    ],
    edges: [
      { source: 'node-input-audio', target: 'node-stt-hindi' },
      { source: 'node-stt-hindi', target: 'node-llm-intent' },
      { source: 'node-llm-intent', target: 'node-tts-hindi' },
      { source: 'node-tts-hindi', target: 'node-output-audio' },
    ],
  },
  {
    id: 'tamil-medical-consult-report',
    name: '🩺 Tamil Voice-to-English Medical Report Generator',
    description: 'Empower vernacular telemedicine. Records Tamil patient symptom audio, transcribes clinical terms using Saaras STT, translates to English medical terminology with Mayura, and formats a structured SOAP medical report.',
    category: 'healthcare',
    categoryLabel: 'Healthcare',
    icon: 'Stethoscope',
    badge: 'Signature',
    tags: ['Healthcare', 'Telemedicine', 'Tamil', 'Medical SOAP', 'OCR/STT'],
    estimatedCost: '₹0.35 / report',
    estimatedLatency: '1.8s',
    languagesSupported: ['Tamil (ta-IN)', 'English (en-IN)'],
    nodes: [
      { id: 'node-patient-audio', type: 'audio_input', label: 'Patient Voice Audio', config: { input_type: 'upload' } },
      { id: 'node-stt-tamil', type: 'stt', label: 'Saaras Tamil STT', config: { language_code: 'ta-IN', model: 'saaras:v3', mode: 'transcribe' } },
      { id: 'node-translate-en', type: 'translate', label: 'Indic to English Translate', config: { source_language_code: 'ta-IN', target_language_code: 'en-IN', mode: 'formal' } },
      { id: 'node-summarize-soap', type: 'summarize', label: 'SOAP Medical Formatter', config: { max_length: 'medium' } },
      { id: 'node-report-out', type: 'text_output', label: 'Clinical English Report', config: {} },
    ],
    edges: [
      { source: 'node-patient-audio', target: 'node-stt-tamil' },
      { source: 'node-stt-tamil', target: 'node-translate-en' },
      { source: 'node-translate-en', target: 'node-summarize-soap' },
      { source: 'node-summarize-soap', target: 'node-report-out' },
    ],
  },
  {
    id: 'indic-multilingual-video-dubber',
    name: '🎬 Regional YouTube/Podcast Multi-Language Dubber',
    description: 'Automated video & podcast localization studio. Takes master English/Hindi audio, generates precise timestamps with Saaras STT, translates to Telugu, Tamil & Bengali, and synthesizes 3 localized neural voice dub tracks in parallel.',
    category: 'media',
    categoryLabel: 'Media & Dubbing',
    icon: 'Radio',
    badge: 'Signature',
    tags: ['YouTube Dubbing', 'Podcast Studio', 'Telugu', 'Tamil', 'Bengali', 'Multi-Language'],
    estimatedCost: '₹0.90 / min',
    estimatedLatency: '3.5s',
    languagesSupported: ['Hindi', 'Telugu', 'Tamil', 'Bengali', 'English'],
    nodes: [
      { id: 'node-master-audio', type: 'audio_input', label: 'Master Episode Audio', config: { input_type: 'upload' } },
      { id: 'node-stt-master', type: 'stt', label: 'Saaras Master STT', config: { language_code: 'auto', model: 'saaras:v3', mode: 'transcribe' } },
      { id: 'node-trans-te', type: 'translate', label: 'Translate to Telugu', config: { source_language_code: 'auto', target_language_code: 'te-IN', mode: 'modern-colloquial' } },
      { id: 'node-tts-te', type: 'tts', label: 'Bulbul Telugu Voice', config: { target_language_code: 'te-IN', speaker: 'aditya', pace: 1.0, model: 'bulbul:v3' } },
      { id: 'node-trans-ta', type: 'translate', label: 'Translate to Tamil', config: { source_language_code: 'auto', target_language_code: 'ta-IN', mode: 'modern-colloquial' } },
      { id: 'node-tts-ta', type: 'tts', label: 'Bulbul Tamil Voice', config: { target_language_code: 'ta-IN', speaker: 'kavya', pace: 1.0, model: 'bulbul:v3' } },
      { id: 'node-out-te', type: 'audio_output', label: 'Telugu Audio Track', config: {} },
      { id: 'node-out-ta', type: 'audio_output', label: 'Tamil Audio Track', config: {} },
    ],
    edges: [
      { source: 'node-master-audio', target: 'node-stt-master' },
      { source: 'node-stt-master', target: 'node-trans-te' },
      { source: 'node-trans-te', target: 'node-tts-te' },
      { source: 'node-tts-te', target: 'node-out-te' },
      { source: 'node-stt-master', target: 'node-trans-ta' },
      { source: 'node-trans-ta', target: 'node-tts-ta' },
      { source: 'node-tts-ta', target: 'node-out-ta' },
    ],
  },
  {
    id: 'voice-dubber-translator',
    name: '🎙️ Voice Dubber & Translator',
    description: 'Upload spoken regional audio, transcribe it with Saaras STT, translate across Indic languages with Mayura, and synthesize natural speech with Bulbul TTS.',
    category: 'audio',
    categoryLabel: 'Speech & Audio',
    icon: 'Mic',
    badge: 'Popular',
    tags: ['STT', 'Translation', 'TTS', 'Audio Dubbing'],
    estimatedCost: '₹0.30 / run',
    estimatedLatency: '1.5s',
    languagesSupported: ['Hindi', 'Telugu', 'Kannada', 'Marathi'],
    nodes: [
      { id: 'node-audio-in', type: 'audio_input', label: 'Audio Upload', config: { input_type: 'upload' } },
      { id: 'node-stt', type: 'stt', label: 'Saaras STT', config: { language_code: 'hi-IN', model: 'saaras:v3', mode: 'transcribe' } },
      { id: 'node-translate', type: 'translate', label: 'Mayura Translate', config: { source_language_code: 'auto', target_language_code: 'te-IN', mode: 'formal' } },
      { id: 'node-tts', type: 'tts', label: 'Bulbul TTS', config: { target_language_code: 'te-IN', speaker: 'aditya', pace: 1.0, model: 'bulbul:v3' } },
      { id: 'node-audio-out', type: 'audio_output', label: 'Audio Out', config: {} },
    ],
    edges: [
      { source: 'node-audio-in', target: 'node-stt' },
      { source: 'node-stt', target: 'node-translate' },
      { source: 'node-translate', target: 'node-tts' },
      { source: 'node-tts', target: 'node-audio-out' },
    ],
  },
  {
    id: 'document-ocr-summary',
    name: '📄 Multilingual Document OCR & Summary',
    description: 'Extract text from scanned PDFs or images using Sarvam Document OCR, generate concise summaries, and output formatted takeaways.',
    category: 'document',
    categoryLabel: 'Document AI',
    icon: 'FileText',
    badge: 'Productivity',
    tags: ['OCR', 'PDF Extractor', 'Document Summary', 'Vision AI'],
    estimatedCost: '₹0.50 / page',
    estimatedLatency: '2.1s',
    languagesSupported: ['22+ Scheduled Indian Languages'],
    nodes: [
      { id: 'node-doc-in', type: 'document_input', label: 'Document Input', config: {} },
      { id: 'node-ocr', type: 'ocr', label: 'Sarvam Vision OCR', config: {} },
      { id: 'node-summarize', type: 'summarize', label: 'Summarizer', config: { max_length: 'medium' } },
      { id: 'node-text-out', type: 'text_output', label: 'Summary Output', config: {} },
    ],
    edges: [
      { source: 'node-doc-in', target: 'node-ocr' },
      { source: 'node-ocr', target: 'node-summarize' },
      { source: 'node-summarize', target: 'node-text-out' },
    ],
  },
  {
    id: 'indic-podcast-generator',
    name: '🎧 2-Speaker Indic Podcast Studio',
    description: 'Input any topic or article, translate to a target regional language, and generate an engaging two-host conversational podcast with alternating voices.',
    category: 'podcast',
    categoryLabel: 'Audio Studio',
    icon: 'PlayCircle',
    badge: 'Creative',
    tags: ['Podcast', 'Dual Speaker', 'Audiobook', 'Bulbul TTS'],
    estimatedCost: '₹0.80 / ep',
    estimatedLatency: '3.0s',
    languagesSupported: ['Telugu', 'Hindi', 'Tamil', 'Marathi'],
    nodes: [
      { id: 'node-text-in', type: 'text_input', label: 'Topic Prompt', config: { text: 'Explain quantum computing in simple conversational Telugu.' } },
      { id: 'node-podcast', type: 'podcast', label: 'Conversational Podcast', config: { language_code: 'te-IN', host1_speaker: 'aditya', host2_speaker: 'kavya' } },
      { id: 'node-audio-out', type: 'audio_output', label: 'Podcast Audio Out', config: {} },
    ],
    edges: [
      { source: 'node-text-in', target: 'node-podcast' },
      { source: 'node-podcast', target: 'node-audio-out' },
    ],
  },
  {
    id: 'customer-sentiment-feedback',
    name: '📊 Customer Call Sentiment Analyzer',
    description: 'Transcribe customer call recordings, analyze emotional sentiment polarity, and route structured insights to support dashboards.',
    category: 'analytics',
    categoryLabel: 'Enterprise Analytics',
    icon: 'Smile',
    badge: 'Enterprise',
    tags: ['Call Center', 'Sentiment', 'Analytics', 'Quality Audit'],
    estimatedCost: '₹0.40 / call',
    estimatedLatency: '1.4s',
    languagesSupported: ['All Indian Languages + English'],
    nodes: [
      { id: 'node-audio-in', type: 'audio_input', label: 'Customer Call Audio', config: { input_type: 'upload' } },
      { id: 'node-stt', type: 'stt', label: 'Saaras STT', config: { language_code: 'auto', model: 'saaras:v3', mode: 'transcribe' } },
      { id: 'node-sentiment', type: 'sentiment', label: 'Sentiment Classifier', config: {} },
      { id: 'node-text-out', type: 'text_output', label: 'Sentiment Report', config: {} },
    ],
    edges: [
      { source: 'node-audio-in', target: 'node-stt' },
      { source: 'node-stt', target: 'node-sentiment' },
      { source: 'node-sentiment', target: 'node-text-out' },
    ],
  },
];

/**
 * Automatically computes ranks and positions for a DAG of nodes.
 */
export function computeAutoLayout(
  nodes: Node[],
  edges: Edge[],
  optionsOrStartX?: number | { startX?: number; startY?: number; columnSpacing?: number; rowSpacing?: number },
  paramStartY = 150,
  paramColumnSpacing = 280,
  paramRowSpacing = 160
): Node[] {
  let startX = 100;
  let startY = paramStartY;
  let columnSpacing = paramColumnSpacing;
  let rowSpacing = paramRowSpacing;

  if (typeof optionsOrStartX === 'number') {
    startX = optionsOrStartX;
  } else if (typeof optionsOrStartX === 'object' && optionsOrStartX !== null) {
    if (optionsOrStartX.startX !== undefined) startX = optionsOrStartX.startX;
    if (optionsOrStartX.startY !== undefined) startY = optionsOrStartX.startY;
    if (optionsOrStartX.columnSpacing !== undefined) columnSpacing = optionsOrStartX.columnSpacing;
    if (optionsOrStartX.rowSpacing !== undefined) rowSpacing = optionsOrStartX.rowSpacing;
  }

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  });

  edges.forEach((e) => {
    if (adj.has(e.source)) {
      adj.get(e.source)!.push(e.target);
    }
    if (inDegree.has(e.target)) {
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  });

  const nodeRank = new Map<string, number>();
  const queue: string[] = [];

  nodes.forEach((n) => {
    if ((inDegree.get(n.id) || 0) === 0) {
      nodeRank.set(n.id, 0);
      queue.push(n.id);
    }
  });

  if (queue.length === 0 && nodes.length > 0) {
    nodeRank.set(nodes[0].id, 0);
    queue.push(nodes[0].id);
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currRank = nodeRank.get(curr) ?? 0;

    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      const existingRank = nodeRank.get(next) ?? 0;
      if (currRank + 1 > existingRank) {
        nodeRank.set(next, currRank + 1);
        queue.push(next);
      }
    }
  }

  nodes.forEach((n) => {
    if (!nodeRank.has(n.id)) {
      nodeRank.set(n.id, 0);
    }
  });

  const rankGroups = new Map<number, Node[]>();
  nodes.forEach((n) => {
    const rank = nodeRank.get(n.id) ?? 0;
    if (!rankGroups.has(rank)) {
      rankGroups.set(rank, []);
    }
    rankGroups.get(rank)!.push(n);
  });

  return nodes.map((node) => {
    const rank = nodeRank.get(node.id) ?? 0;
    const group = rankGroups.get(rank) || [node];
    const indexInGroup = group.findIndex((n) => n.id === node.id);

    const totalGroupHeight = (group.length - 1) * rowSpacing;
    const yOffset = startY - totalGroupHeight / 2 + indexInGroup * rowSpacing;

    return {
      ...node,
      position: {
        x: startX + rank * columnSpacing,
        y: Math.max(40, yOffset),
      },
    };
  });
}

/**
 * Creates full React Flow nodes & edges from a template definition.
 */
export function createGraphFromTemplate(template: PipelineTemplate): {
  nodes: Node[];
  edges: Edge[];
} {
  const rawNodes: Node[] = template.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: { x: 0, y: 0 },
    data: {
      label: n.label,
      config: { ...n.config },
    },
  }));

  const rawEdges: Edge[] = template.edges.map((e, idx) => ({
    id: `e-${e.source}-${e.target}-${idx}`,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle || null,
    targetHandle: e.targetHandle || null,
    type: 'deletable',
    animated: true,
  }));

  const positionedNodes = computeAutoLayout(rawNodes, rawEdges);

  return {
    nodes: positionedNodes,
    edges: rawEdges,
  };
}
