import { SerializedEdge, SerializedNode } from '@/types/pipeline';
import { executeSarvamSTT, executeSarvamTTS, executeSarvamTranslate, executeSarvamLLM, executeSarvamVision } from './sarvam';
import { safeFetch } from './api/safeFetch';

/**
 * Utility function to replace dynamic variables formatted as {{expression}}
 * Matches can be node IDs (e.g. {{node_123}}) or properties (e.g. {{node_123.text}})
 */
export function replaceVariables(
  text: string,
  nodeOutputs: Record<string, any>,
  initialInputs: Record<string, any> = {}
): string {
  if (!text || typeof text !== 'string') return text;

  return text.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    const path = expression.trim();

    // 1. Check in initialInputs directly
    if (initialInputs[path] !== undefined && typeof initialInputs[path] === 'string') {
      return initialInputs[path];
    }
    if (initialInputs.variables && initialInputs.variables[path] !== undefined) {
      return String(initialInputs.variables[path]);
    }

    // 2. Resolve dot notation or label matches
    const parts = path.split('.');
    const identifier = parts[0];
    const property = parts[1];

    if (nodeOutputs[identifier] !== undefined) {
      const out = nodeOutputs[identifier];
      if (!property) {
        if (typeof out === 'string') return out;
        return out.response || out.text || out.translated_text || out.transcript || JSON.stringify(out);
      } else {
        if (out && typeof out === 'object' && out[property] !== undefined) {
          return String(out[property]);
        }
      }
    }

    const matchedNodeId = Object.keys(nodeOutputs).find((id) => {
      return id.toLowerCase() === identifier.toLowerCase();
    });

    if (matchedNodeId && nodeOutputs[matchedNodeId] !== undefined) {
      const out = nodeOutputs[matchedNodeId];
      if (!property) {
        if (typeof out === 'string') return out;
        return out.response || out.text || out.translated_text || out.transcript || JSON.stringify(out);
      } else {
        if (out && typeof out === 'object' && out[property] !== undefined) {
          return String(out[property]);
        }
      }
    }

    return match;
  });
}

/**
 * Splits large text blocks into sentence-bounded chunks of at most maxLen characters
 * to prevent hitting external API character thresholds.
 */
export function splitTextIntoSentenceChunks(text: string, maxLen: number = 400): string[] {
  const sentences = text.match(/[^.!?।|\n]+[.!?।|\n]*/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLen) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      if (sentence.length > maxLen) {
        let temp = sentence;
        while (temp.length > maxLen) {
          chunks.push(temp.substring(0, maxLen).trim());
          temp = temp.substring(maxLen);
        }
        currentChunk = temp;
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}


/**
 * Splits a document into overlapping chunks for retrieval.
 *
 * Chunk boundaries follow sentences rather than raw character offsets. Slicing
 * on offsets cut words in half, and in Indic scripts it can cut between a base
 * character and its combining mark, leaving a broken grapheme at both edges of
 * the seam. The overlap is carried over from the end of the previous chunk and
 * re-aligned to a word boundary for the same reason.
 */
export function chunkDocument(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  if (!text.trim()) return [];

  const size = Math.max(1, Math.floor(chunkSize));
  // The overlap has to leave forward progress. The editor's sliders allow an
  // overlap larger than the chunk size, which produced a negative step and
  // silently truncated the document to a single chunk.
  const overlap = Math.min(Math.max(0, Math.floor(chunkOverlap)), size - 1);

  const base = splitTextIntoSentenceChunks(text, size);
  if (overlap === 0 || base.length <= 1) return base;

  return base.map((chunk, i) => {
    if (i === 0) return chunk;
    const prev = base[i - 1];
    const rawTail = prev.slice(Math.max(0, prev.length - overlap));
    // Start the carried-over text at a word boundary so the tail never begins
    // mid-word — and so it cannot begin inside a grapheme cluster.
    const boundary = rawTail.search(/\s/);
    const tail = boundary >= 0 ? rawTail.slice(boundary + 1) : rawTail;
    return tail ? `${tail.trim()} ${chunk}`.trim() : chunk;
  });
}

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
      const textToTranslate = replaceVariables(upstreamInputText || 'Welcome to Sarvam AI Pipeline', nodeOutputs, initialInputs);
      output = await executeSarvamTranslate({
        input: textToTranslate,
        source_language_code: node.config?.source_language_code || 'auto',
        target_language_code: node.config?.target_language_code || 'hi-IN',
        mode: node.config?.mode || 'formal',
      });
    } else if (node.type === 'tts') {
      const textToVoice = replaceVariables(upstreamInputText || 'सर्वम एआई नोड पाइपलाइन में आपका स्वागत है।', nodeOutputs, initialInputs);
      const chunks = splitTextIntoSentenceChunks(textToVoice, 400);

      const audioBuffers: Buffer[] = [];
      
      // Execute TTS requests in parallel
      const ttsPromises = chunks.map(chunk => 
        executeSarvamTTS({
          text: chunk,
          target_language_code: node.config?.target_language_code || 'hi-IN',
          speaker: node.config?.speaker || 'aditya',
          pace: Number(node.config?.pace || 1.0),
          model: node.config?.model || 'bulbul:v3',
        })
      );
      
      const results = await Promise.all(ttsPromises);
      for (const res of results) {
        if (res.audios && res.audios.length > 0) {
          audioBuffers.push(Buffer.from(res.audios[0], 'base64'));
        }
      }

      // Concatenate WAV buffers
      let combinedBuffer = Buffer.alloc(0);
      if (audioBuffers.length > 0) {
        let totalDataSize = 0;
        for (const buf of audioBuffers) {
          if (buf.length > 44) {
            totalDataSize += (buf.length - 44);
          }
        }

        if (totalDataSize > 0 && audioBuffers[0].length >= 44) {
          const firstHeader = Buffer.alloc(44);
          audioBuffers[0].copy(firstHeader, 0, 0, 44);
          firstHeader.writeUInt32LE(36 + totalDataSize, 4);
          firstHeader.writeUInt32LE(totalDataSize, 40);

          const segments = [firstHeader];
          for (const buf of audioBuffers) {
            if (buf.length > 44) {
              segments.push(Buffer.from(buf.subarray(44)));
            }
          }
          combinedBuffer = Buffer.concat(segments);
        }
      }

      output = {
        audios: combinedBuffer.length > 0 ? [combinedBuffer.toString('base64')] : [],
        response: textToVoice,
        format: 'wav',
      };
    } else if (node.type === 'podcast') {
      const topic = replaceVariables(upstreamInputText || 'Artificial Intelligence: Boon or Bane', nodeOutputs, initialInputs);
      const speakerA = node.config?.speaker_a || 'aditya';
      const speakerB = node.config?.speaker_b || 'ritu';
      const lang = node.config?.target_language_code || 'hi-IN';
      const turns = Number(node.config?.turns || 4);

      const style = node.config?.conversation_style || 'debate';
      const scriptType = node.config?.script_type || 'formal';
      const injectFillers = node.config?.inject_fillers !== false;
      const paceA = Number(node.config?.pace_a ?? 1.0);
      const paceB = Number(node.config?.pace_b ?? 0.95);

      const langNames: Record<string, string> = {
        'hi-IN': 'Hindi',
        'te-IN': 'Telugu',
        'ta-IN': 'Tamil',
        'en-IN': 'English',
        'kn-IN': 'Kannada',
        'ml-IN': 'Malayalam',
        'mr-IN': 'Marathi',
        'bn-IN': 'Bengali',
        'gu-IN': 'Gujarati',
        'pa-IN': 'Punjabi',
        'od-IN': 'Odia'
      };
      const targetLangName = langNames[lang] || 'Hindi';

      // Build style-specific rules
      let styleDirectives = '';
      if (style === 'interview') {
        styleDirectives = `Speaker A must act as a podcast interviewer/host, asking curious questions. Speaker B must respond as the subject expert with informative answers.`;
      } else if (style === 'casual') {
        styleDirectives = `Both speakers must talk in a casual, friendly, chatty co-host review format, sharing collaborative thoughts.`;
      } else {
        styleDirectives = `Speaker A and Speaker B must have different, contrasting, and debating perspectives on the topic.`;
      }

      if (scriptType === 'code-mixed') {
        styleDirectives += ` The dialogue script MUST be written in natural spoken code-mixed vernacular (e.g. mix English terms and phrases with the regional language ${targetLangName}, such as Hinglish/Tenglish style). Keep it sounding like standard real-life podcast conversation.`;
      } else {
        styleDirectives += ` The dialogue script must be written in pure, grammatically formal ${targetLangName}.`;
      }

      if (injectFillers) {
        const fillerWords: Record<string, string[]> = {
          'hi-IN': ['Hmm', 'Achha', 'Okay', 'Bilkul', 'Yaar', 'Achaa'],
          'te-IN': ['Hmm', 'Avuna', 'Okay', 'Choodu', 'Alaaga', 'Kadaa'],
          'ta-IN': ['Hmm', 'Appadiya', 'Okay', 'Aama', 'Sari', 'Kettuka'],
          'en-IN': ['Hmm', 'Like', 'Okay', 'Right', 'So', 'Well', 'You know'],
          'kn-IN': ['Hmm', 'Howda', 'Okay', 'Kano', 'Yenappa', 'Aythu'],
          'bn-IN': ['Hmm', 'Tai', 'Okay', 'Acha', 'Na ki', 'Bujhle'],
          'mr-IN': ['Hmm', 'Ho ka', 'Okay', 'Bar ka', 'Nakkich', 'Acha'],
          'gu-IN': ['Hmm', 'Sachu', 'Okay', 'Em', 'Barabar', 'Acha'],
          'ml-IN': ['Hmm', 'Aano', 'Okay', 'Sheri', 'Pinne', 'Ketto'],
          'pa-IN': ['Hmm', 'Acha', 'Okay', 'Hanji', 'Sahi', 'Vee'],
          'od-IN': ['Hmm', 'Hela', 'Okay', 'Acha', 'Sata', 'Kahnki']
        };
        const selectedFillers = fillerWords[lang] || fillerWords['en-IN'];
        styleDirectives += ` Randomly inject natural human filler words/sounds (like ${selectedFillers.map(f => `'${f}'`).join(', ')}) at the very beginning of some dialogue turns in the script to make the conversation feel alive, raw, and unscripted.`;
      }

      // 1. Generate Podcast Script via LLM
      const llmRes = await executeSarvamLLM({
        model: 'sarvam-105b',
        system_prompt: `You are a professional podcast script generator. You must generate a dialogue script for two speakers ("A" and "B") discussing the topic.
${styleDirectives}
Keep each dialogue turn concise (1-2 sentences max).
Return ONLY a valid JSON object matching the following structure:
{
  "dialogues": [
    {"speaker": "A", "text": "dialogue turn text"},
    {"speaker": "B", "text": "dialogue turn text"}
  ]
}`,
        prompt: `Generate a script in ${targetLangName} with exactly ${turns} turns about the topic: "${topic}".`,
        temperature: 0.7,
      });

      let scriptObj: { dialogues: { speaker: 'A' | 'B'; text: string }[] };
      try {
        let cleanText = llmRes.response.trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }
        scriptObj = JSON.parse(cleanText);
      } catch (err) {
        console.warn('Failed to parse podcast script JSON, falling back to basic mock script', err);
        scriptObj = {
          dialogues: [
            { speaker: 'A', text: `नमस्ते। आज हम चर्चा करेंगे: ${topic}। यह बहुत ही रोचक विषय है।` },
            { speaker: 'B', text: 'जी हाँ, लेकिन इसके दोनों पहलू हैं। हमें इसके फायदे और नुकसान दोनों को देखना होगा।' }
          ]
        };
      }

      // Normalize speaker keys to uppercase 'A' or 'B'
      const normalizedDialogues = (scriptObj.dialogues || []).map((turn) => {
        let sp: 'A' | 'B' = 'A';
        const rawSp = String(turn.speaker || '').toUpperCase();
        if (rawSp.includes('B') || rawSp === '2') {
          sp = 'B';
        }
        return { speaker: sp, text: turn.text || '' };
      });

      // 2. Synthesize each dialogue line
      const audioBuffers: Buffer[] = [];
      for (const turn of normalizedDialogues) {
        const selectedSpeaker = turn.speaker === 'A' ? speakerA : speakerB;
        const currentPace = turn.speaker === 'A' ? paceA : paceB;
        const ttsRes = await executeSarvamTTS({
          text: turn.text,
          target_language_code: lang,
          speaker: selectedSpeaker,
          pace: currentPace,
          model: 'bulbul:v3',
        });
        if (ttsRes.audios && ttsRes.audios.length > 0) {
          audioBuffers.push(Buffer.from(ttsRes.audios[0], 'base64'));
        }
      }

      // 3. Concatenate WAV buffers
      let combinedBuffer = Buffer.alloc(0);
      if (audioBuffers.length > 0) {
        let totalDataSize = 0;
        for (const buf of audioBuffers) {
          if (buf.length > 44) {
            totalDataSize += (buf.length - 44);
          }
        }

        if (totalDataSize > 0 && audioBuffers[0].length >= 44) {
          const firstHeader = Buffer.alloc(44);
          audioBuffers[0].copy(firstHeader, 0, 0, 44);
          firstHeader.writeUInt32LE(36 + totalDataSize, 4);
          firstHeader.writeUInt32LE(totalDataSize, 40);

          const segments = [firstHeader];
          for (const buf of audioBuffers) {
            if (buf.length > 44) {
              segments.push(Buffer.from(buf.subarray(44)));
            }
          }
          combinedBuffer = Buffer.concat(segments);
        }
      }

      const transcriptText = normalizedDialogues
        .map((t) => `${t.speaker === 'A' ? 'Speaker A' : 'Speaker B'}: ${t.text}`)
        .join('\n\n');

      output = {
        audios: combinedBuffer.length > 0 ? [combinedBuffer.toString('base64')] : [],
        response: transcriptText,
        format: 'wav',
      };
    } else if (node.type === 'router') {
      const conditionType = node.config?.condition_type || 'contains';
      const conditionValue = replaceVariables(String(node.config?.condition_value || ''), nodeOutputs, initialInputs).trim().toLowerCase();
      const inputText = String(upstreamInputText || '').trim().toLowerCase();
      
      let matched = false;
      if (conditionType === 'equals') {
        matched = inputText === conditionValue;
      } else if (conditionType === 'starts_with') {
        matched = inputText.startsWith(conditionValue);
      } else if (conditionType === 'sentiment') {
        let sentimentLabel = inputText;
        try {
          if (dynamicInputPayload && typeof dynamicInputPayload === 'object') {
            sentimentLabel = String(dynamicInputPayload.sentiment || dynamicInputPayload.response || '').trim().toLowerCase();
          } else {
            const parsed = JSON.parse(upstreamInputText);
            sentimentLabel = String(parsed.sentiment || '').trim().toLowerCase();
          }
        } catch (_) {}
        matched = sentimentLabel.includes(conditionValue);
      } else if (conditionType === 'classification') {
        let categoryLabel = inputText;
        try {
          if (dynamicInputPayload && typeof dynamicInputPayload === 'object') {
            categoryLabel = String(dynamicInputPayload.category || dynamicInputPayload.response || '').trim().toLowerCase();
          } else {
            const parsed = JSON.parse(upstreamInputText);
            categoryLabel = String(parsed.category || '').trim().toLowerCase();
          }
        } catch (_) {}
        matched = categoryLabel.includes(conditionValue);
      } else {
        matched = inputText.includes(conditionValue);
      }

      output = {
        matched,
        activeHandle: matched ? 'true' : 'false',
        response: `Condition [${conditionType} = "${conditionValue}"]: ${matched ? 'MATCHED' : 'NOT MATCHED'} (Routing to ${matched ? 'True' : 'False'} branch)`
      };
    } else if (node.type === 'delay') {
      const seconds = Number(node.config?.duration || 5);
      await new Promise((res) => setTimeout(res, seconds * 1000));
      output = {
        response: `Successfully delayed pipeline execution by ${seconds} seconds.`,
        text: upstreamInputText
      };
    } else if (node.type === 'pdf_splitter') {
      const text = upstreamInputText || '';
      const chunks = chunkDocument(
        text,
        Number(node.config?.chunk_size || 500),
        Number(node.config?.chunk_overlap || 50)
      );

      if (chunks.length === 0) {
        throw new Error(
          'Document Chunker received no text. Connect a Vision / Document AI node upstream to digitise the file before chunking.'
        );
      }

      output = {
        chunks,
        response: `Text successfully divided into ${chunks.length} chunks.`,
        text: chunks[0] || ''
      };
    } else if (node.type === 'vector_search') {
      const rawQuery = node.config?.query || '';
      const query = replaceVariables(rawQuery, nodeOutputs, initialInputs).trim().toLowerCase();
      
      let searchPool: string[] = [];
      // An upstream chunker that produced nothing must fall through to the
      // configured context rather than searching an empty pool and reporting
      // "no matching contexts" for every query.
      if (dynamicInputPayload && Array.isArray(dynamicInputPayload.chunks) && dynamicInputPayload.chunks.length > 0) {
        searchPool = dynamicInputPayload.chunks;
      } else {
        const rawFallback = node.config?.fallback_context || '';
        const fallbackText = replaceVariables(rawFallback, nodeOutputs, initialInputs);
        searchPool = fallbackText.split('\n\n').filter(Boolean);
      }

      const queryWords = query.split(/\s+/).filter(Boolean);
      const matches = searchPool.map(chunk => {
        let score = 0;
        const chunkLower = chunk.toLowerCase();
        queryWords.forEach(word => {
          if (chunkLower.includes(word)) score += 1;
        });
        return { chunk, score };
      });

      const sortedMatches = matches
        .filter(m => m.score > 0 || queryWords.length === 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const topResult = sortedMatches.map(m => m.chunk).join('\n\n');
      output = {
        text: topResult || 'No matching contexts found.',
        response: topResult || 'No matching contexts found.',
        matches: sortedMatches
      };
    } else if (node.type === 'transliteration') {
      const source = node.config?.source_script || 'Devanagari';
      const target = node.config?.target_script || 'Latin';
      const textToTransliterate = replaceVariables(upstreamInputText, nodeOutputs, initialInputs);

      const translitRes = await executeSarvamLLM({
        model: 'sarvam-105b',
        system_prompt: `You are a script transliterator. Convert the user input from ${source} script to ${target} script based strictly on phonetics and pronunciation.
Do NOT translate the meaning, only convert the letters/script phonetically. Return ONLY the transliterated text with no other explanations.`,
        prompt: textToTransliterate,
        temperature: 0.1,
      });

      output = {
        text: translitRes.response.trim(),
        response: translitRes.response.trim()
      };
    } else if (node.type === 'codemix_normalizer') {
      const targetLang = node.config?.target_language || 'Hindi';
      const textToClean = replaceVariables(upstreamInputText, nodeOutputs, initialInputs);

      const normalRes = await executeSarvamLLM({
        model: 'sarvam-105b',
        system_prompt: `You are a code-mix cleaning assistant. The user will provide code-mixed speech-to-text inputs (e.g. mixed Hinglish or Tenglish). 
Standardize and convert it into a formal, grammatically correct single language: ${targetLang}. 
Keep the tone natural and original meaning fully intact. Return ONLY the polished text block with no surrounding conversational comments.`,
        prompt: textToClean,
        temperature: 0.1,
      });

      output = {
        text: normalRes.response.trim(),
        response: normalRes.response.trim()
      };
    } else if (node.type === 'webhook') {
      const rawUrl = node.config?.webhook_url || '';
      const resolvedUrl = replaceVariables(rawUrl, nodeOutputs, initialInputs);
      const method = node.config?.http_method || 'POST';
      const payloadText = replaceVariables(upstreamInputText, nodeOutputs, initialInputs);

      let responseText = '';
      try {
        const fetchOptions: any = {
          method,
          headers: { 'Content-Type': 'application/json' },
        };
        if (method === 'POST') {
          fetchOptions.body = JSON.stringify({
            nodeId: node.id,
            timestamp: new Date().toISOString(),
            input: payloadText,
            variables: initialInputs.variables || {}
          });
        }
        // Guarded: the URL is fully user-controlled, so it must not be able to
        // reach loopback/private/link-local addresses on the deployment network.
        const res = await safeFetch(resolvedUrl, fetchOptions);
        responseText = res.body.toString('utf8');
      } catch (err: any) {
        responseText = `Webhook Dispatch Failed: ${err.message}`;
      }
      output = {
        response: responseText,
        text: responseText,
        url: resolvedUrl
      };
    } else if (node.type === 'sms_sender') {
      const recipient = node.config?.recipient_phone || '';
      const rawMessage = node.config?.sms_message || '';
      const message = replaceVariables(rawMessage, nodeOutputs, initialInputs);

      output = {
        response: `SMS simulation sent successfully to ${recipient}. Message: "${message}"`,
        text: `SMS simulation sent successfully to ${recipient}. Message: "${message}"`,
        recipient,
        message
      };
    } else if (node.type === 'llm') {
      const selectedModel = node.config?.model || 'sarvam-105b';
      const resolvedPrompt = replaceVariables(node.config?.prompt || '', nodeOutputs, initialInputs);
      const resolvedSystem = replaceVariables(node.config?.system_prompt || '', nodeOutputs, initialInputs);
      output = await executeSarvamLLM({
        model: selectedModel,
        prompt: resolvedPrompt,
        system_prompt: resolvedSystem,
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
