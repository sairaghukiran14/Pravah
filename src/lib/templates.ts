import { Node, Edge } from '@xyflow/react';
import { NodeType } from '@/types/pipeline';

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  category: 'audio' | 'document' | 'podcast' | 'analytics';
  icon: string;
  badge: string;
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
    id: 'voice-dubber-translator',
    name: '🎙️ Voice Dubber & Translator',
    description: 'Upload spoken regional audio, transcribe it with Saaras STT, translate across Indic languages with Mayura, and synthesize natural speech with Bulbul TTS.',
    category: 'audio',
    icon: 'Mic',
    badge: 'Popular',
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
    icon: 'FileText',
    badge: 'Productivity',
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
    name: '🎧 2-Speaker Indic Podcast Generator',
    description: 'Input any topic or article, translate to a target regional language, and generate an engaging two-host conversational podcast with alternating voices.',
    category: 'podcast',
    icon: 'PlayCircle',
    badge: 'Audio Studio',
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
    name: '📊 Customer Audio Sentiment Analyzer',
    description: 'Transcribe customer call recordings, analyze emotional sentiment polarity, and route structured insights to support dashboards.',
    category: 'analytics',
    icon: 'Smile',
    badge: 'Enterprise',
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
 * Computes layered topological positions for graph nodes.
 * Automatically aligns nodes horizontally in sequential ranks with vertical centering.
 */
export function computeAutoLayout(
  nodes: Node[],
  edges: Edge[],
  options: {
    columnSpacing?: number;
    rowSpacing?: number;
    startX?: number;
    startY?: number;
  } = {}
): Node[] {
  if (!nodes.length) return [];

  const columnSpacing = options.columnSpacing ?? 280;
  const rowSpacing = options.rowSpacing ?? 140;
  const startX = options.startX ?? 80;
  const startY = options.startY ?? 140;

  // Build adjacency graph & in-degree map
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  });

  edges.forEach((e) => {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  });

  // Calculate topological rank / layer per node using BFS
  const nodeRank = new Map<string, number>();
  const queue: string[] = [];

  // Nodes with 0 in-degree start at rank 0
  nodes.forEach((n) => {
    if ((inDegree.get(n.id) || 0) === 0) {
      nodeRank.set(n.id, 0);
      queue.push(n.id);
    }
  });

  // If cycle or disconnected, default unranked to 0
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

  // Ensure every node has a rank
  nodes.forEach((n) => {
    if (!nodeRank.has(n.id)) {
      nodeRank.set(n.id, 0);
    }
  });

  // Group nodes by rank
  const rankGroups = new Map<number, Node[]>();
  nodes.forEach((n) => {
    const rank = nodeRank.get(n.id) ?? 0;
    if (!rankGroups.has(rank)) {
      rankGroups.set(rank, []);
    }
    rankGroups.get(rank)!.push(n);
  });

  // Assign positions
  return nodes.map((node) => {
    const rank = nodeRank.get(node.id) ?? 0;
    const group = rankGroups.get(rank) || [node];
    const indexInGroup = group.findIndex((n) => n.id === node.id);

    // Center the group vertically around startY
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
