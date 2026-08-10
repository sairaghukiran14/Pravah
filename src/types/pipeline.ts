export type NodeType = 
  | 'stt' | 'translate' | 'tts' | 'podcast' | 'router' | 'delay'
  | 'pdf_splitter' | 'vector_search' | 'transliteration' | 'codemix_normalizer' | 'webhook' | 'sms_sender'
  // Inputs
  | 'audio_input' | 'text_input' | 'document_input' | 'image_input' | 'video_input' | 'url_input'
  // Processing
  | 'ocr' | 'vision' | 'llm' | 'summarize' | 'sentiment' | 'keyword_extraction' | 'classification'
  // Outputs
  | 'text_output' | 'audio_output' | 'file_output';

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface STTConfig {
  language_code: string;
  model: string;
  mode: 'transcribe' | 'translate' | 'verbatim' | 'translit' | 'codemix';
}

export interface TranslateConfig {
  source_language_code: string;
  target_language_code: string;
  mode: 'formal' | 'classic-colloquial' | 'modern-colloquial';
}

export interface TTSConfig {
  target_language_code: string;
  speaker: string;
  pace: number;
  model: string;
}

export interface GenericConfig {
  [key: string]: any;
}

export type NodeConfig = STTConfig | TranslateConfig | TTSConfig | GenericConfig;

export interface SerializedNode {
  id: string;
  type: NodeType;
  label: string;
  positionX: number;
  positionY: number;
  config: Record<string, any>;
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface PipelineData {
  id: string;
  name: string;
  description?: string | null;
  projectId: string;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectData {
  id: string;
  name: string;
  description?: string | null;
  pipelines?: PipelineData[];
  _count?: {
    pipelines: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface NodeRunData {
  id: string;
  runId: string;
  nodeId: string;
  nodeType: NodeType;
  status: RunStatus;
  input?: any;
  output?: any;
  error?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface PipelineRunData {
  id: string;
  pipelineId: string;
  status: RunStatus;
  input?: any;
  startedAt: string;
  finishedAt?: string | null;
  nodeRuns: NodeRunData[];
}
