'use client';

import React from 'react';
import { usePipelineStore } from '@/store/pipelineStore';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { X, Trash2, Mic, Languages, Volume2, Play, Square, Upload } from 'lucide-react';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { normalizeToWav, blobToDataUrl } from '@/lib/audio/normalize';

/**
 * Language coverage differs by model, so these are two lists rather than one.
 *
 * Speech-to-text (Saaras v3), translation and Document AI cover the full
 * 23-language set; speech synthesis (Bulbul v3) and the Sarvam-105B text models
 * cover 11. Offering the wider list everywhere would let someone pick Assamese
 * for a voice node and only discover it is unsupported when the run fails.
 */
const SPEECH_TEXT_LANGUAGES = [
  { label: 'Hindi (hi-IN)', value: 'hi-IN' },
  { label: 'English (en-IN)', value: 'en-IN' },
  { label: 'Telugu (te-IN)', value: 'te-IN' },
  { label: 'Tamil (ta-IN)', value: 'ta-IN' },
  { label: 'Bengali (bn-IN)', value: 'bn-IN' },
  { label: 'Kannada (kn-IN)', value: 'kn-IN' },
  { label: 'Malayalam (ml-IN)', value: 'ml-IN' },
  { label: 'Marathi (mr-IN)', value: 'mr-IN' },
  { label: 'Gujarati (gu-IN)', value: 'gu-IN' },
  { label: 'Punjabi (pa-IN)', value: 'pa-IN' },
  { label: 'Odia (od-IN)', value: 'od-IN' },
  { label: 'Assamese (as-IN)', value: 'as-IN' },
  { label: 'Urdu (ur-IN)', value: 'ur-IN' },
  { label: 'Nepali (ne-IN)', value: 'ne-IN' },
  { label: 'Konkani (kok-IN)', value: 'kok-IN' },
  { label: 'Kashmiri (ks-IN)', value: 'ks-IN' },
  { label: 'Sindhi (sd-IN)', value: 'sd-IN' },
  { label: 'Sanskrit (sa-IN)', value: 'sa-IN' },
  { label: 'Santali (sat-IN)', value: 'sat-IN' },
  { label: 'Manipuri (mni-IN)', value: 'mni-IN' },
  { label: 'Bodo (brx-IN)', value: 'brx-IN' },
  { label: 'Maithili (mai-IN)', value: 'mai-IN' },
  { label: 'Dogri (doi-IN)', value: 'doi-IN' },
];

/** Bulbul v3 and the Sarvam-105B text models. */
const VOICE_LANGUAGES = SPEECH_TEXT_LANGUAGES.slice(0, 11);

const SOURCE_LANGUAGES = [{ label: 'Auto Detect', value: 'auto' }, ...SPEECH_TEXT_LANGUAGES];

/** Sarvam's /transliterate covers the same 11 languages as the voice models. */
const TRANSLITERATION_LANGUAGES = VOICE_LANGUAGES;

/**
 * Maps the script name an older transliteration node stored onto the language
 * code the endpoint takes, so opening a pipeline saved before the switch shows
 * what it will actually run rather than an unrelated default.
 */
function legacyScriptLanguage(script?: string): string | undefined {
  if (!script) return undefined;
  const map: Record<string, string> = {
    latin: 'en-IN', roman: 'en-IN', english: 'en-IN',
    devanagari: 'hi-IN', hindi: 'hi-IN', marathi: 'mr-IN',
    bengali: 'bn-IN', gujarati: 'gu-IN', kannada: 'kn-IN',
    malayalam: 'ml-IN', odia: 'od-IN', oriya: 'od-IN',
    gurmukhi: 'pa-IN', punjabi: 'pa-IN', tamil: 'ta-IN', telugu: 'te-IN',
  };
  return map[script.trim().toLowerCase()];
}

const SPEAKER_VOICES = [
  { label: 'Aditya', value: 'aditya' },
  { label: 'Ritu', value: 'ritu' },
  { label: 'Priya', value: 'priya' },
  { label: 'Rohan', value: 'rohan' },
  { label: 'Neha', value: 'neha' },
  { label: 'Kavya', value: 'kavya' },
  { label: 'Amit', value: 'amit' },
  { label: 'Pooja', value: 'pooja' },
  { label: 'Shubh', value: 'shubh' },
  { label: 'Shreya', value: 'shreya' },
  { label: 'Manan', value: 'manan' },
  { label: 'Ishita', value: 'ishita' },
];

export const ConfigPanel: React.FC = () => {
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId);
  const selectNode = usePipelineStore((s) => s.selectNode);
  const nodes = usePipelineStore((s) => s.nodes);
  const updateNodeConfig = usePipelineStore((s) => s.updateNodeConfig);
  const updateNodeLabel = usePipelineStore((s) => s.updateNodeLabel);
  const removeNode = usePipelineStore((s) => s.removeNode);

  const [isPlayingSample, setIsPlayingSample] = React.useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingDuration, setRecordingDuration] = React.useState(0);
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const mediaRecorder = React.useRef<MediaRecorder | null>(null);
  const audioChunks = React.useRef<Blob[]>([]);
  const timerInterval = React.useRef<NodeJS.Timeout | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const isVisible = !!selectedNode;

  const nodeType = selectedNode?.type as import('@/types/pipeline').NodeType;

  const config = (selectedNode?.data?.config as Record<string, any>) || {};

  const handleChange = (key: string, value: any) => {
    if (selectedNode) updateNodeConfig(selectedNode.id, { [key]: value });
  };

  const startRecording = async () => {
    try {
      setRecordingDuration(0);
      setIsProcessing(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      audioChunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        setIsProcessing(true);
        const recorded = new Blob(audioChunks.current, { type: 'audio/webm' });

        try {
          // WebM cannot be split into the 30s segments Sarvam's endpoint
          // requires, so it is converted to WAV here while a decoder is at hand.
          const { blob, durationSeconds } = await normalizeToWav(recorded);
          handleChange('audio_data', {
            type: 'audio',
            data: await blobToDataUrl(blob),
            url: URL.createObjectURL(blob),
            durationSeconds,
          });
        } catch (err) {
          console.error('Could not process the recording', err);
          alert(err instanceof Error ? err.message : 'Could not process the recording');
        } finally {
          setIsProcessing(false);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);

      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      timerInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const playSample = async () => {
    setIsPlayingSample(true);
    try {
      const res = await fetch('/api/tts/sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speaker: config.speaker || 'aditya',
          target_language_code: config.target_language_code || 'hi-IN'
        })
      });
      const data = await res.json();
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        audio.play();
        audio.onended = () => setIsPlayingSample(false);
      } else {
        throw new Error(data.error || 'Failed to fetch sample');
      }
    } catch (e) {
      alert('Error playing sample: ' + e);
      setIsPlayingSample(false);
    }
  };


  return (
    <div
      className={`transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden z-30 ${isVisible
        ? 'w-[280px] sm:w-[320px] md:w-72 border-r border-gray-200 absolute md:relative left-0 top-0 bottom-0 h-full bg-white shadow-2xl md:shadow-none'
        : 'w-0 border-r-0 border-transparent'
        }`}
    >
      <aside className="relative w-full h-full bg-white flex flex-col justify-between overflow-hidden min-w-0">
        {isVisible && selectedNode && (
          <div className="p-4 flex-1 space-y-4 min-w-0 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                {nodeType === 'stt' && <div className="p-1.5 rounded-lg bg-emerald-50 shrink-0"><Mic className="h-4 w-4 text-emerald-600" /></div>}
                {nodeType === 'translate' && <div className="p-1.5 rounded-lg bg-blue-50 shrink-0"><Languages className="h-4 w-4 text-blue-600" /></div>}
                {nodeType === 'tts' && <div className="p-1.5 rounded-lg bg-orange-50 shrink-0"><Volume2 className="h-4 w-4 text-orange-600" /></div>}
                <div className="min-w-0">
                  <input
                    type="text"
                    value={selectedNode.data.label as string}
                    onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
                    className="text-sm font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none transition-colors w-full p-0 m-0 leading-tight"
                    placeholder="Node Label"
                  />
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{selectedNode.id}</p>
                </div>
              </div>
              <button onClick={() => selectNode(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto overflow-x-hidden flex-1 min-w-0">
              {/* STT */}
              {nodeType === 'stt' && (
                <>
                  <Select label="Audio Language" value={config.language_code || 'hi-IN'} onChange={(val) => handleChange('language_code', val)} options={SPEECH_TEXT_LANGUAGES} />
                  <Select label="Model" value={config.model || 'saaras:v3'} onChange={(val) => handleChange('model', val)} options={[{ label: 'Saaras v3 (Recommended)', value: 'saaras:v3' }, { label: 'Saaras v2.5 (Legacy)', value: 'saaras:v2.5' }]} />
                  <Select label="Mode" value={config.mode || 'transcribe'} onChange={(val) => handleChange('mode', val)} options={[{ label: 'Transcribe', value: 'transcribe' }, { label: 'Translate to English', value: 'translate' }, { label: 'Verbatim', value: 'verbatim' }, { label: 'Transliterate', value: 'translit' }, { label: 'Code-Mixed', value: 'codemix' }]} />
                </>
              )}

              {/* Translate */}
              {nodeType === 'translate' && (
                <>
                  <Select label="Source Language" value={config.source_language_code || 'auto'} onChange={(val) => handleChange('source_language_code', val)} options={SOURCE_LANGUAGES} />
                  <Select label="Target Language" value={config.target_language_code || 'hi-IN'} onChange={(val) => handleChange('target_language_code', val)} options={SPEECH_TEXT_LANGUAGES} />
                  <Select label="Translation Mode" value={config.mode || 'formal'} onChange={(val) => handleChange('mode', val)} options={[{ label: 'Formal', value: 'formal' }, { label: 'Classic Colloquial', value: 'classic-colloquial' }, { label: 'Modern Colloquial', value: 'modern-colloquial' }]} />
                </>
              )}

              {/* TTS */}
              {nodeType === 'tts' && (
                <>
                  <Select label="Target Language" value={config.target_language_code || 'hi-IN'} onChange={(val) => handleChange('target_language_code', val)} options={VOICE_LANGUAGES} />
                  <div>
                    <Select label="Speaker Voice" value={config.speaker || 'aditya'} onChange={(val) => handleChange('speaker', val)} options={SPEAKER_VOICES} />
                    <button
                      onClick={playSample}
                      disabled={isPlayingSample}
                      className="mt-1 flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-md text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Play className={`h-3 w-3 ${isPlayingSample ? 'animate-pulse text-orange-600' : ''}`} />
                      {isPlayingSample ? 'Playing Sample...' : 'Preview Voice'}
                    </button>
                  </div>
                  <Select label="Model" value={config.model || 'bulbul:v3'} onChange={(val) => handleChange('model', val)} options={[{ label: 'Bulbul v3', value: 'bulbul:v3' }]} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between">
                      <span>Pace</span>
                      <span className="font-mono text-gray-500">{config.pace || 1.0}x</span>
                    </label>
                    <input type="range" min="0.5" max="2.0" step="0.1" value={config.pace || 1.0} onChange={(e) => handleChange('pace', parseFloat(e.target.value))} className="w-full accent-gray-900 cursor-pointer" />
                  </div>
                </>
              )}

              {/* Podcast Generator */}
              {nodeType === 'podcast' && (
                <>
                  <Select label="Speaker A Voice" value={config.speaker_a || 'aditya'} onChange={(val) => handleChange('speaker_a', val)} options={SPEAKER_VOICES} />
                  <Select label="Speaker B Voice" value={config.speaker_b || 'ritu'} onChange={(val) => handleChange('speaker_b', val)} options={SPEAKER_VOICES} />
                  <Select label="Language" value={config.target_language_code || 'hi-IN'} onChange={(val) => handleChange('target_language_code', val)} options={VOICE_LANGUAGES} />
                  
                  <Select 
                    label="Conversation Style" 
                    value={config.conversation_style || 'debate'} 
                    onChange={(val) => handleChange('conversation_style', val)} 
                    options={[
                      { label: 'Contrasting Debate', value: 'debate' },
                      { label: 'Host Interview (Q&A)', value: 'interview' },
                      { label: 'Casual Chit-Chat', value: 'casual' }
                    ]} 
                  />

                  <Select 
                    label="Scripting Style" 
                    value={config.script_type || 'formal'} 
                    onChange={(val) => handleChange('script_type', val)} 
                    options={[
                      { label: 'Formal INDIC Grammar', value: 'formal' },
                      { label: 'Code-Mixed Vernacular (Hinglish/etc)', value: 'code-mixed' }
                    ]} 
                  />

                  <div className="flex items-center gap-2 py-1">
                    <input 
                      type="checkbox" 
                      id="inject_fillers"
                      checked={config.inject_fillers !== false} 
                      onChange={(e) => handleChange('inject_fillers', e.target.checked)} 
                      className="rounded border-gray-300 text-gray-900 focus:ring-gray-900 h-4 w-4 cursor-pointer" 
                    />
                    <label htmlFor="inject_fillers" className="text-sm font-medium text-gray-700 cursor-pointer select-none">Inject Human Conversational Fillers</label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between">
                      <span>Speaker A Pace</span>
                      <span className="font-mono text-gray-500">{config.pace_a || 1.0}x</span>
                    </label>
                    <input type="range" min="0.8" max="1.2" step="0.05" value={config.pace_a || 1.0} onChange={(e) => handleChange('pace_a', parseFloat(e.target.value))} className="w-full accent-gray-900 cursor-pointer" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between">
                      <span>Speaker B Pace</span>
                      <span className="font-mono text-gray-500">{config.pace_b || 0.95}x</span>
                    </label>
                    <input type="range" min="0.8" max="1.2" step="0.05" value={config.pace_b || 0.95} onChange={(e) => handleChange('pace_b', parseFloat(e.target.value))} className="w-full accent-gray-900 cursor-pointer" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between">
                      <span>Conversational Turns</span>
                      <span className="font-mono text-gray-500">{config.turns || 4} turns</span>
                    </label>
                    <input type="range" min="2" max="10" step="2" value={config.turns || 4} onChange={(e) => handleChange('turns', parseInt(e.target.value))} className="w-full accent-gray-900 cursor-pointer" />
                  </div>
                </>
              )}

              {/* Router */}
              {nodeType === 'router' && (
                <>
                  <Select 
                    label="Condition Type" 
                    value={config.condition_type || 'contains'} 
                    onChange={(val) => handleChange('condition_type', val)} 
                    options={[
                      { label: 'Text Contains', value: 'contains' },
                      { label: 'Text Equals', value: 'equals' },
                      { label: 'Text Starts With', value: 'starts_with' },
                      { label: 'Sentiment Equals', value: 'sentiment' },
                      { label: 'Category Equals', value: 'classification' },
                      { label: 'Number Greater Than', value: 'gt' },
                      { label: 'Number Greater Than or Equal', value: 'gte' },
                      { label: 'Number Less Than', value: 'lt' },
                      { label: 'Number Less Than or Equal', value: 'lte' }
                    ]}
                  />
                  {(() => {
                    // Offered for every condition, not just the numeric ones —
                    // matching language_code from a Detect Language node needs
                    // the same mechanism as comparing a confidence score.
                    const isNumeric = ['gt', 'gte', 'lt', 'lte'].includes(config.condition_type);
                    return (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Field to Compare</label>
                        <input
                          type="text"
                          value={config.condition_field || ''}
                          onChange={(e) => handleChange('condition_field', e.target.value)}
                          placeholder={isNumeric ? 'confidence' : 'leave blank to match the incoming text'}
                          className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-gray-900 focus:outline-none"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          {isNumeric ? (
                            <>Which number on the incoming result to test. Defaults to <span className="font-mono">confidence</span>.</>
                          ) : (
                            <>Which field of the incoming result to match — for example <span className="font-mono">language_code</span> or <span className="font-mono">script_code</span> from a Detect Language node. Leave blank to match the text itself.</>
                          )}
                        </p>
                      </div>
                    );
                  })()}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Condition Value</label>
                    <input
                      type="text"
                      value={config.condition_value || ''}
                      onChange={(e) => handleChange('condition_value', e.target.value)}
                      placeholder="e.g. billing, POSITIVE, 0.8"
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-gray-900 focus:outline-none" 
                    />
                  </div>
                </>
              )}

              {/* Delay */}
              {nodeType === 'delay' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between">
                    <span>Delay Duration</span>
                    <span className="font-mono text-gray-500">{config.duration || 5} seconds</span>
                  </label>
                  <input 
                    type="range" 
                    min="1" 
                    max="30" 
                    step="1" 
                    value={config.duration || 5} 
                    onChange={(e) => handleChange('duration', parseInt(e.target.value))} 
                    className="w-full accent-gray-900 cursor-pointer" 
                  />
                </div>
              )}

              {/* Chunker / Splitter */}
              {nodeType === 'pdf_splitter' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between">
                      <span>Chunk Size (chars)</span>
                      <span className="font-mono text-gray-500">{config.chunk_size || 500} chars</span>
                    </label>
                    <input 
                      type="range" 
                      min="100" 
                      max="3000" 
                      step="50" 
                      value={config.chunk_size || 500} 
                      onChange={(e) => handleChange('chunk_size', parseInt(e.target.value))} 
                      className="w-full accent-gray-900 cursor-pointer" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between">
                      <span>Chunk Overlap</span>
                      <span className="font-mono text-gray-500">{config.chunk_overlap || 50} chars</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" 
                      max="500" 
                      step="10" 
                      value={config.chunk_overlap || 50} 
                      onChange={(e) => handleChange('chunk_overlap', parseInt(e.target.value))} 
                      className="w-full accent-gray-900 cursor-pointer" 
                    />
                  </div>
                </>
              )}

              {/* Vector Query */}
              {nodeType === 'vector_search' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Query Words</label>
                    <input 
                      type="text" 
                      value={config.query || ''} 
                      onChange={(e) => handleChange('query', e.target.value)} 
                      placeholder="e.g. {{text_input}} or search terms" 
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-gray-900 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Fallback Context Document</label>
                    <textarea 
                      rows={3} 
                      value={config.fallback_context || ''} 
                      onChange={(e) => handleChange('fallback_context', e.target.value)} 
                      placeholder="Enter optional document context here..."
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-gray-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">
                      Chunks are ranked by how many of your query words they contain, and the top
                      three are returned. This matches wording rather than meaning, so use words
                      that appear in the document.
                    </p>
                  </div>
                </>
              )}

              {/* Transliteration */}
              {nodeType === 'transliteration' && (
                <>
                  <Select
                    label="Source Language"
                    value={config.source_language_code || legacyScriptLanguage(config.source_script) || 'hi-IN'}
                    onChange={(val) => handleChange('source_language_code', val)}
                    options={TRANSLITERATION_LANGUAGES}
                  />
                  <Select
                    label="Target Language"
                    value={config.target_language_code || legacyScriptLanguage(config.target_script) || 'en-IN'}
                    onChange={(val) => handleChange('target_language_code', val)}
                    options={TRANSLITERATION_LANGUAGES}
                  />
                  <Select
                    label="Numerals"
                    value={config.numerals_format || 'international'}
                    onChange={(val) => handleChange('numerals_format', val)}
                    options={[
                      { label: 'International (0-9)', value: 'international' },
                      { label: 'Native script digits', value: 'native' },
                    ]}
                  />
                  <Select
                    label="Spoken Form"
                    value={config.spoken_form ? 'true' : 'false'}
                    onChange={(val) => handleChange('spoken_form', val === 'true')}
                    options={[
                      { label: 'Off — transliterate as written', value: 'false' },
                      { label: 'On — write numbers and abbreviations as spoken', value: 'true' },
                    ]}
                  />
                  <p className="text-xs text-gray-500">
                    Converts script without changing the language. To convert meaning, use a Translate node.
                  </p>
                </>
              )}

              {/* OCR */}
              {nodeType === 'ocr' && (
                <>
                  <Select
                    label="Document Language"
                    value={config.language || 'hi-IN'}
                    onChange={(val) => handleChange('language', val)}
                    options={SPEECH_TEXT_LANGUAGES}
                  />
                  <Select
                    label="Output Format"
                    value={config.output_format || 'md'}
                    onChange={(val) => handleChange('output_format', val)}
                    options={[
                      { label: 'Markdown — keeps headings and tables', value: 'md' },
                      { label: 'HTML', value: 'html' },
                    ]}
                  />
                  <p className="text-xs text-gray-500">
                    Extracts the text as written, without interpreting it. To ask questions or analyze the document, connect an LLM node downstream.
                  </p>
                </>
              )}

              {/* Language Detection */}
              {nodeType === 'language_detect' && (
                <p className="text-xs text-gray-500">
                  Reports the language and script of the incoming text and passes the text through
                  unchanged. Branch on the result with a Router node set to match the{' '}
                  <span className="font-mono">language_code</span> or{' '}
                  <span className="font-mono">script_code</span> field.
                </p>
              )}

              {/* Code-Mix Cleaner */}
              {nodeType === 'codemix_normalizer' && (
                <Select 
                  label="Target Formal Language" 
                  value={config.target_language || 'Hindi'} 
                  onChange={(val) => handleChange('target_language', val)} 
                  options={[
                    { label: 'Pure Hindi (शुद्ध हिंदी)', value: 'Hindi' },
                    { label: 'Pure English', value: 'English' },
                    { label: 'Pure Telugu (తెలుగు)', value: 'Telugu' },
                    { label: 'Pure Tamil (தமிழ்)', value: 'Tamil' }
                  ]} 
                />
              )}

              {/* Webhook */}
              {nodeType === 'webhook' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Webhook URL</label>
                    <input 
                      type="url" 
                      value={config.webhook_url || ''} 
                      onChange={(e) => handleChange('webhook_url', e.target.value)} 
                      placeholder="https://api.example.com/endpoint" 
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-gray-900 focus:outline-none" 
                    />
                  </div>
                  <Select 
                    label="HTTP Method" 
                    value={config.http_method || 'POST'} 
                    onChange={(val) => handleChange('http_method', val)} 
                    options={[
                      { label: 'POST (JSON payload)', value: 'POST' },
                      { label: 'GET (Query params)', value: 'GET' }
                    ]} 
                  />
                </>
              )}

              {/* SMS Dispatcher */}
              {nodeType === 'sms_sender' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Recipient Phone Number</label>
                    <input 
                      type="tel" 
                      value={config.recipient_phone || ''} 
                      onChange={(e) => handleChange('recipient_phone', e.target.value)} 
                      placeholder="+919876543210" 
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-gray-900 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">SMS Message Template</label>
                    <textarea 
                      rows={3} 
                      value={config.sms_message || ''} 
                      onChange={(e) => handleChange('sms_message', e.target.value)} 
                      placeholder="e.g. Translation update: {{translate}}" 
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-gray-900 focus:outline-none" 
                    />
                  </div>
                </>
              )}

              {/* New Input Nodes */}
              {nodeType === 'audio_input' && (
                <>
                  <Select label="Input Type" value={config.input_type || 'upload'} onChange={(val) => handleChange('input_type', val)} options={[{ label: 'Upload Audio', value: 'upload' }, { label: 'Record Microphone', value: 'mic' }, { label: 'Audio URL', value: 'url' }]} />
                  
                  {config.input_type === 'mic' && (
                     <div className="flex flex-col gap-2 mt-2">
                       {isProcessing ? (
                         <div className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-lg bg-white">
                           <span className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></span>
                           <span className="text-xs text-gray-500 font-medium">Processing recording...</span>
                         </div>
                       ) : !config.audio_data ? (
                         <div className="flex flex-col gap-2">
                           {isRecording && (
                             <div className="flex items-center justify-center gap-2 py-1.5 bg-red-50 border border-red-100 rounded-lg animate-pulse">
                               <span className="h-2.5 w-2.5 rounded-full bg-red-600"></span>
                               <span className="text-xs font-mono font-bold text-red-600">
                                 Recording: {(() => {
                                   const m = Math.floor(recordingDuration / 60).toString().padStart(2, '0');
                                   const s = (recordingDuration % 60).toString().padStart(2, '0');
                                   return `${m}:${s}`;
                                 })()}
                               </span>
                             </div>
                           )}
                           <Button 
                             type="button"
                             variant={isRecording ? "danger" : "secondary"} 
                             size="md" 
                             className={`w-full justify-center ${isRecording ? 'animate-pulse ring-2 ring-red-500/30' : ''} cursor-pointer`}
                             onClick={isRecording ? stopRecording : startRecording}
                             icon={
                               isRecording ? (
                                 <span className="flex items-center gap-1.5">
                                   <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                                   <Square className="h-3.5 w-3.5 fill-current" />
                                 </span>
                               ) : (
                                 <Mic className="h-4 w-4 text-gray-700" />
                               )
                             }
                           >
                             {isRecording ? 'Stop Recording' : 'Start Recording'}
                           </Button>
                         </div>
                       ) : (
                         <div className="flex flex-col gap-2 w-full mt-2">
                           <AudioPlayer src={config.audio_data.url} compact={true} />
                           <div className="flex justify-end">
                             <button type="button" onClick={() => handleChange('audio_data', null)} className="text-xs text-red-600 font-semibold hover:text-red-700 bg-red-50 hover:bg-red-100/85 px-2.5 py-1 rounded transition-colors cursor-pointer">Retake</button>
                           </div>
                         </div>
                       )}
                     </div>
                  )}

                  {(config.input_type === 'upload' || !config.input_type) && (
                     <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-white text-center hover:bg-gray-50 transition cursor-pointer relative">
                        <Upload className="h-5 w-5 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-600 font-medium">Click to upload audio</span>
                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="audio/*" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsProcessing(true);
                          try {
                            // Converted up front so the server can split it into
                            // the 30s segments Sarvam's endpoint needs.
                            const { blob, durationSeconds } = await normalizeToWav(file);
                            handleChange('audio_data', {
                              type: 'audio',
                              data: await blobToDataUrl(blob),
                              name: file.name,
                              url: URL.createObjectURL(blob),
                              durationSeconds,
                            });
                          } catch (err) {
                            console.error('Could not read the audio file', err);
                            alert(err instanceof Error ? err.message : 'Could not read the audio file');
                          } finally {
                            setIsProcessing(false);
                          }
                        }} />
                        {config.audio_data?.name && <div className="mt-2 text-[10px] font-semibold text-emerald-600">Selected: {config.audio_data.name}</div>}
                     </div>
                  )}

                  {config.input_type === 'url' && (
                     <div className="mt-2">
                       <input type="url" placeholder="https://example.com/audio.mp3" value={config.audio_url || ''} className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-gray-900 focus:outline-none" onChange={(e) => handleChange('audio_url', e.target.value)} />
                     </div>
                  )}
                </>
              )}
              {nodeType === 'text_input' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Text Area</label>
                  <textarea className="w-full rounded-lg border border-gray-300 p-2 text-sm" rows={4} value={config.text || ''} onChange={(e) => handleChange('text', e.target.value)} placeholder="Enter text here..." />
                </div>
              )}
              {nodeType === 'document_input' && (
                <>
                  <Select label="Document Format" value={config.format || 'pdf'} onChange={(val) => handleChange('format', val)} options={[{ label: 'PDF', value: 'pdf' }, { label: 'DOCX', value: 'docx' }, { label: 'TXT', value: 'txt' }]} />
                  <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-white text-center hover:bg-gray-50 transition cursor-pointer relative">
                    <Upload className="h-5 w-5 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-600 font-medium">Click to upload document</span>
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.docx,.txt" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = () => handleChange('file_data', { type: 'document', data: reader.result, name: file.name, url: URL.createObjectURL(file) });
                      }
                    }} />
                    {config.file_data?.name && <div className="mt-2 text-[10px] font-semibold text-emerald-600 truncate max-w-[200px]">Selected: {config.file_data.name}</div>}
                  </div>
                </>
              )}
              {nodeType === 'image_input' && (
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-white text-center hover:bg-gray-50 transition cursor-pointer relative">
                  <Upload className="h-5 w-5 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-600 font-medium">Click to upload image</span>
                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.readAsDataURL(file);
                      reader.onload = () => handleChange('file_data', { type: 'image', data: reader.result, name: file.name, url: URL.createObjectURL(file) });
                    }
                  }} />
                  {config.file_data?.name && <div className="mt-2 text-[10px] font-semibold text-emerald-600 truncate max-w-[200px]">Selected: {config.file_data.name}</div>}
                </div>
              )}
              {nodeType === 'video_input' && (
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-white text-center hover:bg-gray-50 transition cursor-pointer relative">
                  <Upload className="h-5 w-5 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-600 font-medium">Click to upload video</span>
                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="video/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.readAsDataURL(file);
                      reader.onload = () => handleChange('file_data', { type: 'video', data: reader.result, name: file.name, url: URL.createObjectURL(file) });
                    }
                  }} />
                  {config.file_data?.name && <div className="mt-2 text-[10px] font-semibold text-emerald-600 truncate max-w-[200px]">Selected: {config.file_data.name}</div>}
                </div>
              )}
              {nodeType === 'url_input' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">URL</label>
                  <input type="url" className="w-full rounded-lg border border-gray-300 p-2 text-sm" value={config.url || ''} onChange={(e) => handleChange('url', e.target.value)} placeholder="https://..." />
                </div>
              )}

              {/* New Processing Nodes */}
              {nodeType === 'llm' && (
                <>
                  <Select
                    label="Model"
                    value={config.model || 'sarvam-105b'}
                    onChange={(val) => handleChange('model', val)}
                    options={[
                      { label: 'Sarvam-105B (Sovereign Reasoning LLM)', value: 'sarvam-105b' },
                    ]}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">System Prompt</label>
                    <textarea className="w-full rounded-lg border border-gray-300 p-2 text-sm" rows={2} value={config.system_prompt || ''} onChange={(e) => handleChange('system_prompt', e.target.value)} placeholder="You are an AI assistant..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">User Prompt Instructions</label>
                    <textarea className="w-full rounded-lg border border-gray-300 p-2 text-sm" rows={3} value={config.prompt || ''} onChange={(e) => handleChange('prompt', e.target.value)} placeholder="Specific instructions for incoming payload..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between">
                      <span>Temperature</span>
                      <span className="font-mono text-gray-500">{config.temperature ?? 0.2}</span>
                    </label>
                    <input type="range" min="0" max="1.0" step="0.05" value={config.temperature ?? 0.2} onChange={(e) => handleChange('temperature', parseFloat(e.target.value))} className="w-full accent-gray-900 cursor-pointer" />
                  </div>
                </>
              )}
              {nodeType === 'summarize' && <Select label="Summary Length" value={config.length || 'short'} onChange={(val) => handleChange('length', val)} options={[{ label: 'Short (1 paragraph)', value: 'short' }, { label: 'Medium (3 paragraphs)', value: 'medium' }, { label: 'Long (Detailed)', value: 'long' }]} />}
              {nodeType === 'sentiment' && <Select label="Output Format" value={config.format || 'json'} onChange={(val) => handleChange('format', val)} options={[{ label: 'JSON Object', value: 'json' }, { label: 'Simple Text', value: 'text' }]} />}
              {nodeType === 'keyword_extraction' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between">
                    <span>Max Keywords</span>
                    <span className="font-mono text-gray-500">{config.max_keywords || 5}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={config.max_keywords || 5}
                    onChange={(e) => handleChange('max_keywords', parseInt(e.target.value))}
                    className="w-full accent-gray-900 cursor-pointer"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    Extracts key phrases and core terms from upstream text for indexing or routing.
                  </p>
                </div>
              )}
              {nodeType === 'classification' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Categories</label>
                  <textarea
                    rows={3}
                    value={config.categories || ''}
                    onChange={(e) => handleChange('categories', e.target.value)}
                    placeholder="e.g. Sales, Technical Support, Billing, General Inquiry"
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-gray-900 focus:outline-none"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    Comma-separated candidate labels. Categorizes input text into one of these classes for downstream Router branching.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {isVisible && selectedNode && (
          <div className="pt-4 pb-4 px-4 border-t border-gray-100 mt-auto">
            {isConfirmingDelete ? (
              <div className="w-full">
                <p className="text-xs text-red-600 mb-2 font-medium">Delete this node?</p>
                <div className="flex gap-2">
                  <Button variant="danger" className="flex-1 text-xs py-1.5 h-auto" onClick={() => { removeNode(selectedNode.id); setIsConfirmingDelete(false); }}>Yes</Button>
                  <Button variant="outline" className="flex-1 text-xs py-1.5 h-auto" onClick={() => setIsConfirmingDelete(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100 py-1.5 h-auto flex gap-1.5 items-center justify-center" 
                onClick={() => setIsConfirmingDelete(true)}
                icon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Delete Node
              </Button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};
