import { create } from 'zustand';
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  XYPosition,
} from '@xyflow/react';
import { NodeType, RunStatus, SerializedNode, SerializedEdge, PipelineData } from '@/types/pipeline';

export interface PipelineStoreState {
  // Graph state
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  edgeToDeleteId: string | null;

  // Metadata
  pipelineId: string | null;
  pipelineName: string;
  projectId: string | null;
  isDirty: boolean;
  isSaving: boolean;

  // Real-time execution state
  isRunning: boolean;
  nodeStatuses: Record<string, RunStatus>;
  nodeOutputs: Record<string, any>;
  executionLogs: { time: string; message: string; type: 'info' | 'success' | 'error' }[];
  latestRunId: string | null;
  hoveredNodeType: NodeType | null;

  // Graph actions
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: NodeType, position: XYPosition) => void;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => void;
  updateNodeConfig: (id: string, config: Record<string, any>) => void;
  updateNodeLabel: (id: string, label: string) => void;
  selectNode: (id: string | null) => void;
  setHoveredNodeType: (type: NodeType | null) => void;
  setEdgeToDeleteId: (id: string | null) => void;

  // Pipeline lifecycle actions
  loadPipeline: (pipeline: PipelineData) => void;
  setPipelineName: (name: string) => void;
  savePipeline: () => Promise<boolean>;

  // Execution actions
  startExecution: () => void;
  setNodeStatus: (nodeId: string, status: RunStatus) => void;
  setNodeOutput: (nodeId: string, output: any) => void;
  addExecutionLog: (message: string, type?: 'info' | 'success' | 'error') => void;
  finishExecution: (runId: string, status: RunStatus) => void;
  resetExecution: () => void;
  setCancelExecutionCallback: (cb: (() => void) | null) => void;
  cancelExecution: () => void;
  cancelExecutionCallback: (() => void) | null;
}

const getDefaultConfig = (type: NodeType) => {
  switch (type) {
    case 'stt': return { language_code: 'hi-IN', model: 'saaras:v3', mode: 'transcribe' };
    case 'translate': return { source_language_code: 'auto', target_language_code: 'hi-IN', mode: 'formal' };
    case 'tts': return { target_language_code: 'hi-IN', speaker: 'aditya', pace: 1.0, model: 'bulbul:v3' };
    
    // Inputs
    case 'audio_input': return { input_type: 'upload' };
    case 'text_input': return { text: '' };
    case 'document_input': return { format: 'pdf' };
    case 'image_input': return { source: 'upload' };
    case 'video_input': return { source: 'upload' };
    case 'url_input': return { url: '' };
    
    // Processing
    case 'ocr': return { language: 'eng' };
    case 'vision': return { prompt: 'Describe this image.' };
    case 'llm': return { model: 'sarvam-105b', temperature: 0.7, prompt: 'Summarize the input.' };
    case 'summarize': return { length: 'short' };
    case 'sentiment': return { format: 'json' };
    case 'keyword_extraction': return { max_keywords: 10 };
    case 'classification': return { categories: 'positive, negative, neutral' };
    
    // Outputs
    case 'text_output': return { format: 'markdown' };
    case 'audio_output': return { autoplay: false };
    case 'file_output': return { filename: 'output.txt' };

    default: return {};
  }
};

const getDefaultLabel = (type: NodeType) => {
  switch (type) {
    case 'stt': return 'Sarvam Speech to Text';
    case 'translate': return 'Sarvam Translate';
    case 'tts': return 'Sarvam Text to Speech';
    
    // Inputs
    case 'audio_input': return 'Audio Input';
    case 'text_input': return 'Text Input';
    case 'document_input': return 'Document Input';
    case 'image_input': return 'Image Input';
    case 'video_input': return 'Video Input';
    case 'url_input': return 'URL Input';
    
    // Processing
    case 'ocr': return 'OCR';
    case 'vision': return 'Vision';
    case 'llm': return 'LLM';
    case 'summarize': return 'Summarize';
    case 'sentiment': return 'Sentiment';
    case 'keyword_extraction': return 'Keyword Extraction';
    case 'classification': return 'Classification';
    
    // Outputs
    case 'text_output': return 'Text Output';
    case 'audio_output': return 'Audio Output';
    case 'file_output': return 'File Output';

    default: return 'Node';
  }
};

export const usePipelineStore = create<PipelineStoreState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  edgeToDeleteId: null,

  pipelineId: null,
  pipelineName: 'Untitled Pipeline',
  projectId: null,
  isDirty: false,
  isSaving: false,

  isRunning: false,
  nodeStatuses: {},
  nodeOutputs: {},
  executionLogs: [],
  latestRunId: null,
  cancelExecutionCallback: null,
  hoveredNodeType: null,

  setCancelExecutionCallback: (cb) => set({ cancelExecutionCallback: cb }),
  cancelExecution: () => {
    const cb = get().cancelExecutionCallback;
    if (cb) cb();
    set({
      isRunning: false,
      cancelExecutionCallback: null,
    });
    get().addExecutionLog('⚠️ Execution cancelled by user.', 'error');
  },

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      isDirty: true,
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      isDirty: true,
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(
        {
          ...connection,
          type: 'deletable',
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2 },
        },
        get().edges
      ),
      isDirty: true,
    });
  },

  addNode: (type, position) => {
    const id = `node_${type}_${Math.random().toString(36).substring(2, 9)}`;
    const newNode: Node = {
      id,
      type,
      position,
      data: {
        label: getDefaultLabel(type),
        type,
        config: getDefaultConfig(type),
      },
    };

    set({
      nodes: [...get().nodes, newNode],
      selectedNodeId: id,
      isDirty: true,
    });
  },

  removeNode: (id) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
      isDirty: true,
    });
  },

  removeEdge: (id) => {
    set({
      edges: get().edges.filter((e) => e.id !== id),
      isDirty: true,
    });
  },

  updateNodeConfig: (id, config) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              config: {
                ...(node.data.config as Record<string, any>),
                ...config,
              },
            },
          };
        }
        return node;
      }),
      isDirty: true,
    });
  },

  updateNodeLabel: (id, label) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              label,
            },
          };
        }
        return node;
      }),
      isDirty: true,
    });
  },

  selectNode: (id) => {
    set({ selectedNodeId: id });
  },

  setEdgeToDeleteId: (id) => {
    set({ edgeToDeleteId: id });
  },

  setPipelineName: (name) => {
    set({ pipelineName: name, isDirty: true });
  },

  loadPipeline: (pipeline) => {
    const cleanKey = (keyOrUrl: string | null | undefined): string | null => {
      if (!keyOrUrl) return null;
      if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
        const bucketMarker = keyOrUrl.includes('/pravah-assets/') ? '/pravah-assets/' : '/hasaflow-storage/';
        if (keyOrUrl.includes(bucketMarker)) {
          return keyOrUrl.substring(keyOrUrl.indexOf(bucketMarker) + bucketMarker.length);
        }
        return keyOrUrl.substring(keyOrUrl.lastIndexOf('/') + 1);
      }
      return keyOrUrl;
    };

    const nodes: Node[] = pipeline.nodes.map((n) => {
      const config = { ...((n.config as Record<string, any>) || getDefaultConfig(n.type)) };

      // Auto-migrate legacy Cloudflare direct R2 URLs to the secure proxy route
      if (config.audio_data) {
        const rawKey = config.audio_data.r2_key || config.audio_data.url;
        const r2Key = cleanKey(rawKey);
            
        if (r2Key) {
          config.audio_data = {
            ...config.audio_data,
            r2_key: r2Key,
            url: `/api/audio/file?key=${r2Key}`,
            data: `/api/audio/file?key=${r2Key}`
          };
        }
      }

      if (config.file_data) {
        const rawKey = config.file_data.r2_key || config.file_data.url;
        const r2Key = cleanKey(rawKey);
            
        if (r2Key) {
          config.file_data = {
            ...config.file_data,
            r2_key: r2Key,
            url: `/api/audio/file?key=${r2Key}`,
            data: `/api/audio/file?key=${r2Key}`
          };
        }
      }

      return {
        id: n.id,
        type: n.type,
        position: { x: n.positionX, y: n.positionY },
        data: {
          label: n.label,
          type: n.type,
          config,
        },
      };
    });

    const edges: Edge[] = pipeline.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || undefined,
      targetHandle: e.targetHandle || undefined,
      type: 'deletable',
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
    }));

    set({
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      projectId: pipeline.projectId,
      nodes,
      edges,
      selectedNodeId: null,
      isDirty: false,
      isRunning: false,
      nodeStatuses: {},
      nodeOutputs: {},
      executionLogs: [],
    });
  },

  savePipeline: async () => {
    const { pipelineId, pipelineName, projectId, nodes, edges } = get();
    if (!pipelineId) return false;

    set({ isSaving: true });

    const uploadBinaryToR2 = async (dataUri: string, name: string): Promise<{ url: string; key: string } | null> => {
      const base64Data = dataUri.split(',')[1];
      const mimeMatch = dataUri.match(/^data:([^;]+);/);
      const mime = mimeMatch?.[1] || 'audio/wav';
      const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: mime });
      const formData = new FormData();
      formData.append('file', blob, name || 'audio.wav');
      try {
        const res = await fetch('/api/audio/upload', { method: 'POST', body: formData });
        const result = await res.json();
        if (result.success && result.key) {
          return { url: result.url, key: result.key };
        }
      } catch (e) {
        console.warn('R2 upload failed during save', e);
      }
      return null;
    };

    // Scan nodes for any base64 data to upload
    const updatedNodesConfigs: Record<string, any> = {};
    for (const n of nodes) {
      const config = n.data?.config as Record<string, any>;
      if (config) {
        let changed = false;
        const newConfig = { ...config };
        
        if (config.audio_data?.data && typeof config.audio_data.data === 'string' && config.audio_data.data.startsWith('data:')) {
          const uploadRes = await uploadBinaryToR2(config.audio_data.data, config.audio_data.name || 'recording.wav');
          if (uploadRes) {
            newConfig.audio_data = {
              ...config.audio_data,
              data: uploadRes.url,
              r2_key: uploadRes.key,
              url: uploadRes.url
            };
            changed = true;
          }
        }
        
        if (config.file_data?.data && typeof config.file_data.data === 'string' && config.file_data.data.startsWith('data:')) {
          const uploadRes = await uploadBinaryToR2(config.file_data.data, config.file_data.name || 'file');
          if (uploadRes) {
            newConfig.file_data = {
              ...config.file_data,
              data: uploadRes.url,
              r2_key: uploadRes.key,
              url: uploadRes.url
            };
            changed = true;
          }
        }

        if (changed) {
          updatedNodesConfigs[n.id] = newConfig;
        }
      }
    }

    // Apply any config updates to the store
    if (Object.keys(updatedNodesConfigs).length > 0) {
      set({
        nodes: nodes.map(n => {
          if (updatedNodesConfigs[n.id]) {
            return {
              ...n,
              data: {
                ...n.data,
                config: updatedNodesConfigs[n.id]
              }
            };
          }
          return n;
        })
      });
    }

    const currentNodes = get().nodes;

    // Clean large binary data from configs before saving
    // (audio base64, file base64, etc.) — keep R2 urls
    const stripBinaryData = (config: Record<string, any>): Record<string, any> => {
      const cleaned = { ...config };
      if (cleaned.audio_data) {
        const isUrl = typeof cleaned.audio_data.data === 'string' && !cleaned.audio_data.data.startsWith('data:');
        cleaned.audio_data = {
          type: cleaned.audio_data.type,
          name: cleaned.audio_data.name,
          r2_key: cleaned.audio_data.r2_key || (isUrl ? cleaned.audio_data.data : null),
          data: isUrl ? cleaned.audio_data.data : null,
          url: isUrl ? cleaned.audio_data.url || cleaned.audio_data.data : null,
        };
      }
      if (cleaned.file_data) {
        const isUrl = typeof cleaned.file_data.data === 'string' && !cleaned.file_data.data.startsWith('data:');
        cleaned.file_data = {
          type: cleaned.file_data.type,
          name: cleaned.file_data.name,
          r2_key: cleaned.file_data.r2_key || (isUrl ? cleaned.file_data.data : null),
          data: isUrl ? cleaned.file_data.data : null,
          url: isUrl ? cleaned.file_data.url || cleaned.file_data.data : null,
        };
      }
      return cleaned;
    };

    const serializedNodes: SerializedNode[] = currentNodes.map((n) => ({
      id: n.id,
      type: n.type as NodeType,
      label: (n.data.label as string) || getDefaultLabel(n.type as NodeType),
      positionX: n.position.x,
      positionY: n.position.y,
      config: stripBinaryData((n.data.config as Record<string, any>) || {}),
    }));

    const serializedEdges: SerializedEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || null,
      targetHandle: e.targetHandle || null,
    }));

    try {
      const response = await fetch(`/api/pipelines/${pipelineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pipelineName,
          projectId,
          nodes: serializedNodes,
          edges: serializedEdges,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save pipeline');
      }

      set({ isDirty: false, isSaving: false });
      return true;
    } catch (err) {
      console.error('Error saving pipeline:', err);
      try {
        const localKey = `pipeline_${pipelineId}`;
        localStorage.setItem(
          localKey,
          JSON.stringify({
            id: pipelineId,
            name: pipelineName,
            projectId,
            nodes: serializedNodes,
            edges: serializedEdges,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch (storageErr) {
        console.warn('localStorage fallback also failed:', storageErr);
      }

      set({ isDirty: false, isSaving: false });
      return true;
    }
  },

  startExecution: () => {
    const initialStatuses: Record<string, RunStatus> = {};
    get().nodes.forEach((n) => {
      initialStatuses[n.id] = 'pending';
    });

    set({
      isRunning: true,
      nodeStatuses: initialStatuses,
      nodeOutputs: {},
      executionLogs: [
        {
          time: new Date().toLocaleTimeString(),
          message: '🚀 Starting pipeline execution stream...',
          type: 'info',
        },
      ],
    });
  },

  setNodeStatus: (nodeId, status) => {
    set({
      nodeStatuses: {
        ...get().nodeStatuses,
        [nodeId]: status,
      },
    });
  },

  setNodeOutput: (nodeId, output) => {
    set({
      nodeOutputs: {
        ...get().nodeOutputs,
        [nodeId]: output,
      },
    });
  },

  addExecutionLog: (message, type = 'info') => {
    set({
      executionLogs: [
        ...get().executionLogs,
        { time: new Date().toLocaleTimeString(), message, type },
      ],
    });
  },

  finishExecution: (runId, status) => {
    set({
      isRunning: false,
      latestRunId: runId,
    });
    get().addExecutionLog(
      status === 'completed'
        ? '🎉 Pipeline execution finished successfully!'
        : '❌ Pipeline execution encountered errors.',
      status === 'completed' ? 'success' : 'error'
    );
  },

  resetExecution: () => {
    set({
      isRunning: false,
      nodeStatuses: {},
      nodeOutputs: {},
      executionLogs: [],
    });
  },

  setHoveredNodeType: (type) => {
    set({ hoveredNodeType: type });
  },
}));
