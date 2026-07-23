import { SerializedEdge, SerializedNode } from '@/types/pipeline';
import { executeSarvamSTT, executeSarvamTTS, executeSarvamTranslate } from './sarvam';
import { executeAnthropicNode } from './anthropic';

export interface NodeExecutionResult {
  nodeId: string;
  nodeType: string;
  status: 'completed' | 'failed';
  input: any;
  output: any;
  error?: string;
  durationMs: number;
}

/**
 * Topologically sort nodes based on edge dependencies (Directed Acyclic Graph)
 */
export function sortNodesTopologically(
  nodes: SerializedNode[],
  edges: SerializedEdge[]
): SerializedNode[] {
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, string[]> = {};

  nodes.forEach((n) => {
    inDegree[n.id] = 0;
    adjList[n.id] = [];
  });

  edges.forEach((edge) => {
    if (adjList[edge.source] && inDegree[edge.target] !== undefined) {
      adjList[edge.source].push(edge.target);
      inDegree[edge.target] += 1;
    }
  });

  const queue: string[] = [];
  Object.keys(inDegree).forEach((nodeId) => {
    if (inDegree[nodeId] === 0) {
      queue.push(nodeId);
    }
  });

  const sortedIds: string[] = [];
  while (queue.length > 0) {
    const currId = queue.shift()!;
    sortedIds.push(currId);

    const neighbors = adjList[currId] || [];
    neighbors.forEach((nbr) => {
      inDegree[nbr] -= 1;
      if (inDegree[nbr] === 0) {
        queue.push(nbr);
      }
    });
  }

  // If graph has disconnected or cyclic components, append remaining nodes
  const sortedNodeMap = new Map(nodes.map((n) => [n.id, n]));
  const resultNodes: SerializedNode[] = [];

  sortedIds.forEach((id) => {
    const node = sortedNodeMap.get(id);
    if (node) {
      resultNodes.push(node);
      sortedNodeMap.delete(id);
    }
  });

  // Append any leftover nodes
  sortedNodeMap.forEach((node) => resultNodes.push(node));

  return resultNodes;
}

/**
 * Execute a single node given previous upstream outputs
 */
export async function executeSingleNode(
  node: SerializedNode,
  edges: SerializedEdge[],
  nodeOutputs: Record<string, any>,
  initialInputText: string,
  initialInputs: Record<string, any> = {}
): Promise<NodeExecutionResult> {
  const startTime = Date.now();

  // Find upstream input from connected source nodes
  const incomingEdges = edges.filter((e) => e.target === node.id);
  let upstreamInputText = initialInputText;
  let dynamicInputPayload = null;

  if (incomingEdges.length > 0) {
    const sourceNodeId = incomingEdges[0].source;
    const sourceOutput = nodeOutputs[sourceNodeId];

    if (sourceOutput) {
      if (typeof sourceOutput === 'string') {
        upstreamInputText = sourceOutput;
      } else if (sourceOutput.translated_text) {
        upstreamInputText = sourceOutput.translated_text;
      } else if (sourceOutput.transcript) {
        upstreamInputText = sourceOutput.transcript;
      } else if (sourceOutput.audios) {
        upstreamInputText = 'Audio Generated Successfully';
      } else {
        dynamicInputPayload = sourceOutput;
      }
    }
  } else {
    // If it's an entry node, pull from initialInputs if available
    if (initialInputs[node.id]) {
      const explicitInput = initialInputs[node.id];
      if (typeof explicitInput === 'string') {
        upstreamInputText = explicitInput;
      } else {
        dynamicInputPayload = explicitInput;
      }
    }
  }

  try {
    let output: any = null;

    if (node.type === 'stt') {
      const actualPayload = dynamicInputPayload?.passed_input || dynamicInputPayload;
      output = await executeSarvamSTT({
        file: actualPayload?.data || actualPayload?.url, 
        text_input: upstreamInputText || 'नमस्ते! भारत की कृत्रिम बुद्धिमत्ता सर्वम एआई।',
        language_code: node.config?.language_code || 'hi-IN',
        model: node.config?.model || 'saaras:v3',
        mode: node.config?.mode || 'transcribe',
      });
    } else if (node.type === 'translate') {
      output = await executeSarvamTranslate({
        input: upstreamInputText || 'Welcome to Sarvam AI Pipeline',
        source_language_code: node.config?.source_language_code || 'auto',
        target_language_code: node.config?.target_language_code || 'hi-IN',
        mode: node.config?.mode || 'formal',
      });
    } else if (node.type === 'tts') {
      output = await executeSarvamTTS({
        text: upstreamInputText || 'सर्वम एआई नोड पाइपलाइन में आपका स्वागत है।',
        target_language_code: node.config?.target_language_code || 'hi-IN',
        speaker: node.config?.speaker || 'aditya',
        pace: Number(node.config?.pace || 1.0),
        model: node.config?.model || 'bulbul:v3',
      });
    } else if (
      node.type === 'llm' || 
      node.type === 'summarize' || 
      node.type === 'sentiment' || 
      node.type === 'keyword_extraction' || 
      node.type === 'classification'
    ) {
      output = await executeAnthropicNode(node.type, upstreamInputText || '', node.config || {});
    } else {
      // Mock execution for other structural nodes (like visual elements/OCR/Vision)
      output = { 
        success: true,
        mocked: true,
        passed_input: dynamicInputPayload || upstreamInputText,
        node_type: node.type,
      };
    }

    if (output && output.audios && output.audios.length > 0) {
      try {
        const { uploadToR2 } = await import('./r2');
        const base64Audio = output.audios[0];
        const buffer = Buffer.from(base64Audio, 'base64');
        const filename = `tts_run_${node.id}_${Date.now()}.wav`;
        
        await uploadToR2({
          fileBuffer: buffer,
          fileName: filename,
          contentType: 'audio/wav',
        });
        
        output.audio_r2_key = filename;
        delete output.audios;
      } catch (err: any) {
        console.warn('Failed to upload audio to R2, falling back to base64 payload', err.message);
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      nodeId: node.id,
      nodeType: node.type,
      status: 'completed',
      input: dynamicInputPayload ? { payload: dynamicInputPayload } : { text: upstreamInputText },
      output,
      durationMs,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    return {
      nodeId: node.id,
      nodeType: node.type,
      status: 'failed',
      input: { text: upstreamInputText },
      output: null,
      error: error.message || 'Node execution failed',
      durationMs,
    };
  }
}
