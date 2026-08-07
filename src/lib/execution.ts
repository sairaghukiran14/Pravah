import { SerializedEdge, SerializedNode } from '@/types/pipeline';
import { executeSarvamSTT, executeSarvamTTS, executeSarvamTranslate, executeSarvamLLM, executeSarvamVision } from './sarvam';

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
      dynamicInputPayload = sourceOutput;
      if (typeof sourceOutput === 'string') {
        upstreamInputText = sourceOutput;
      } else if (sourceOutput.response) {
        upstreamInputText = sourceOutput.response;
      } else if (sourceOutput.translated_text) {
        upstreamInputText = sourceOutput.translated_text;
      } else if (sourceOutput.transcript) {
        upstreamInputText = sourceOutput.transcript;
      } else if (sourceOutput.text) {
        upstreamInputText = sourceOutput.text;
      } else if (sourceOutput.audios) {
        upstreamInputText = 'Audio Generated Successfully';
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

    if (node.type === 'text_input') {
      output = node.config?.text || upstreamInputText;
    } else if (node.type === 'text_output') {
      output = { text: upstreamInputText };
    } else if (node.type === 'url_input') {
      output = node.config?.url || upstreamInputText;
    } else if (node.type === 'audio_input') {
      // Priority: RunDialog input > ConfigPanel recording > node.config
      const runDialogAudio = dynamicInputPayload;
      const configAudio = node.config?.audio_data;
      
      const audioPayload =
        runDialogAudio?.data ||
        runDialogAudio?.file ||
        configAudio?.data ||
        node.config?.file ||
        node.config?.audio_url ||
        configAudio?.url ||
        null;
      output = {
        data: audioPayload,
        file: audioPayload,
        url: runDialogAudio?.url || configAudio?.url || node.config?.audio_url || null,
        name: runDialogAudio?.name || configAudio?.name || 'audio_input.wav',
        text: upstreamInputText,
      };
    } else if (node.type === 'image_input' || node.type === 'video_input' || node.type === 'document_input' || node.type === 'file_output') {
      const runDialogFile = dynamicInputPayload;
      const configFile = node.config?.file_data || node.config?.file;
      
      const filePayload =
        runDialogFile?.data ||
        runDialogFile?.file ||
        configFile?.data ||
        node.config?.file ||
        node.config?.file_url ||
        configFile?.url ||
        null;
      output = {
        data: filePayload,
        file: filePayload,
        url: runDialogFile?.url || configFile?.url || node.config?.file_url || null,
        name: runDialogFile?.name || configFile?.name || `${node.type}_file`,
        text: upstreamInputText,
      };
    } else if (node.type === 'audio_output') {
      output = {
        audio_r2_key: dynamicInputPayload?.audio_r2_key || null,
        url: dynamicInputPayload?.url || null,
        text: upstreamInputText
      };
    } else if (node.type === 'stt') {
      const actualPayload = dynamicInputPayload?.passed_input || dynamicInputPayload;
      const audioFile =
        actualPayload?.data ||
        actualPayload?.file ||
        actualPayload?.url ||
        node.config?.file ||
        node.config?.audio_data?.data ||
        node.config?.audio_data?.url ||
        null;

      output = await executeSarvamSTT({
        file: audioFile, 
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
    } else if (node.type === 'llm') {
      const selectedModel = node.config?.model || 'sarvam-105b';
      output = await executeSarvamLLM({
        model: selectedModel,
        prompt: node.config?.prompt,
        system_prompt: node.config?.system_prompt,
        input: upstreamInputText,
        temperature: Number(node.config?.temperature ?? 0.2),
      });
    } else if (node.type === 'summarize') {
      const summaryLength = node.config?.length || 'short';
      output = await executeSarvamLLM({
        model: 'sarvam-105b',
        system_prompt: `You are an AI summarization engine. Summarize the text concisely with length mode '${summaryLength}'.`,
        input: upstreamInputText,
        temperature: 0.2,
      });
    } else if (node.type === 'sentiment') {
      output = await executeSarvamLLM({
        model: 'sarvam-105b',
        system_prompt: 'Analyze the sentiment of the provided text. Return a JSON object with {"sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL", "confidence": number}.',
        input: upstreamInputText,
        temperature: 0.1,
      });
    } else if (node.type === 'keyword_extraction') {
      output = await executeSarvamLLM({
        model: 'sarvam-105b',
        system_prompt: 'Extract the top keywords from the text as a JSON array {"keywords": string[]}.',
        input: upstreamInputText,
        temperature: 0.1,
      });
    } else if (node.type === 'classification') {
      const categories = node.config?.categories || 'Support, Billing, Technical, General';
      output = await executeSarvamLLM({
        model: 'sarvam-105b',
        system_prompt: `Classify the input text into one of these categories: ${categories}. Return JSON {"category": string}.`,
        input: upstreamInputText,
        temperature: 0.1,
      });
    } else if (node.type === 'vision') {
      const fileData = 
        dynamicInputPayload?.data ||
        dynamicInputPayload?.file ||
        node.config?.file_data?.data ||
        node.config?.file?.data ||
        null;
      
      if (!fileData) {
        throw new Error('No document file (image/PDF) provided for Vision Node digitisation.');
      }

      // 1. Submit digitise job and poll for markdown output
      const visionRes = await executeSarvamVision({
        file: fileData,
        language: node.config?.language || 'hi-IN',
        output_format: 'md',
      });

      // 2. Query LLM to reason over the digitised text if a custom prompt is provided
      const customPrompt = node.config?.prompt || 'Describe this image.';
      const outputFormatText = `Document AI Digitised Text:\n\n${visionRes.text}`;
      
      output = await executeSarvamLLM({
        model: 'sarvam-105b',
        system_prompt: `You are a Document AI analysis assistant. The user wants you to analyze the digitized text of their document. Contextualize, describe, or extract details as requested by their prompt.`,
        prompt: customPrompt,
        input: outputFormatText,
        temperature: 0.2,
      });
    } else {
      // Sarvam Vision & Optical Processing Node fallback execution
      output = await executeSarvamLLM({
        model: 'sarvam-105b',
        system_prompt: `You are Sarvam Vision AI processing node (${node.type}). Analyze and process the input payload.`,
        input: upstreamInputText || 'Visual document input payload',
        temperature: 0.2,
      });
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
