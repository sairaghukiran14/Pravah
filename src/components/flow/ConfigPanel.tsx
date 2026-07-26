'use client';

import React from 'react';
import { usePipelineStore } from '@/store/pipelineStore';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { X, Trash2, Mic, Languages, Volume2, Play } from 'lucide-react';

const INDIC_LANGUAGES = [
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
];

const SOURCE_LANGUAGES = [{ label: 'Auto Detect', value: 'auto' }, ...INDIC_LANGUAGES];

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

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const isVisible = !!selectedNode;

  const nodeType = selectedNode?.type as import('@/types/pipeline').NodeType;

  const config = (selectedNode?.data?.config as Record<string, any>) || {};

  const handleChange = (key: string, value: any) => {
    if (selectedNode) updateNodeConfig(selectedNode.id, { [key]: value });
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
      <aside className="relative w-full h-full bg-white flex flex-col justify-between overflow-y-auto overflow-x-hidden min-w-0">
        {isVisible && selectedNode && (
          <div className="p-4 flex-1 space-y-4 min-w-0">
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

            <div className="space-y-3 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-220px)] min-w-0">
              {/* STT */}
              {nodeType === 'stt' && (
                <>
                  <Select label="Audio Language" value={config.language_code || 'hi-IN'} onChange={(val) => handleChange('language_code', val)} options={INDIC_LANGUAGES} />
                  <Select label="Model" value={config.model || 'saaras:v3'} onChange={(val) => handleChange('model', val)} options={[{ label: 'Saaras v3 (Recommended)', value: 'saaras:v3' }, { label: 'Saaras v2.5 (Legacy)', value: 'saaras:v2.5' }]} />
                  <Select label="Mode" value={config.mode || 'transcribe'} onChange={(val) => handleChange('mode', val)} options={[{ label: 'Transcribe', value: 'transcribe' }, { label: 'Translate to English', value: 'translate' }, { label: 'Verbatim', value: 'verbatim' }, { label: 'Transliterate', value: 'translit' }, { label: 'Code-Mixed', value: 'codemix' }]} />
                </>
              )}

              {/* Translate */}
              {nodeType === 'translate' && (
                <>
                  <Select label="Source Language" value={config.source_language_code || 'auto'} onChange={(val) => handleChange('source_language_code', val)} options={SOURCE_LANGUAGES} />
                  <Select label="Target Language" value={config.target_language_code || 'hi-IN'} onChange={(val) => handleChange('target_language_code', val)} options={INDIC_LANGUAGES} />
                  <Select label="Translation Mode" value={config.mode || 'formal'} onChange={(val) => handleChange('mode', val)} options={[{ label: 'Formal', value: 'formal' }, { label: 'Classic Colloquial', value: 'classic-colloquial' }, { label: 'Modern Colloquial', value: 'modern-colloquial' }]} />
                </>
              )}

              {/* TTS */}
              {nodeType === 'tts' && (
                <>
                  <Select label="Target Language" value={config.target_language_code || 'hi-IN'} onChange={(val) => handleChange('target_language_code', val)} options={INDIC_LANGUAGES} />
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

              {/* New Input Nodes */}
              {nodeType === 'audio_input' && <Select label="Input Type" value={config.input_type || 'upload'} onChange={(val) => handleChange('input_type', val)} options={[{ label: 'Upload Audio', value: 'upload' }, { label: 'Record Microphone', value: 'mic' }, { label: 'Audio URL', value: 'url' }]} />}
              {nodeType === 'text_input' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Text Area</label>
                  <textarea className="w-full rounded-lg border border-gray-300 p-2 text-sm" rows={4} value={config.text || ''} onChange={(e) => handleChange('text', e.target.value)} placeholder="Enter text here..." />
                </div>
              )}
              {nodeType === 'document_input' && <Select label="Document Format" value={config.format || 'pdf'} onChange={(val) => handleChange('format', val)} options={[{ label: 'PDF', value: 'pdf' }, { label: 'DOCX', value: 'docx' }, { label: 'TXT', value: 'txt' }]} />}
              {nodeType === 'url_input' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">URL</label>
                  <input type="url" className="w-full rounded-lg border border-gray-300 p-2 text-sm" value={config.url || ''} onChange={(e) => handleChange('url', e.target.value)} placeholder="https://..." />
                </div>
              )}

              {/* New Processing Nodes */}
              {nodeType === 'llm' && (
                <>
                  <Select label="Model" value={config.model || 'gpt-4'} onChange={(val) => handleChange('model', val)} options={[{ label: 'GPT-4', value: 'gpt-4' }, { label: 'Claude 3 Opus', value: 'claude-3' }, { label: 'Gemini 1.5 Pro', value: 'gemini-1.5' }]} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Prompt</label>
                    <textarea className="w-full rounded-lg border border-gray-300 p-2 text-sm" rows={3} value={config.prompt || ''} onChange={(e) => handleChange('prompt', e.target.value)} placeholder="System instructions..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between">
                      <span>Temperature</span>
                      <span className="font-mono text-gray-500">{config.temperature || 0.7}</span>
                    </label>
                    <input type="range" min="0" max="2.0" step="0.1" value={config.temperature || 0.7} onChange={(e) => handleChange('temperature', parseFloat(e.target.value))} className="w-full accent-gray-900 cursor-pointer" />
                  </div>
                </>
              )}
              {nodeType === 'vision' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Vision Prompt</label>
                  <textarea className="w-full rounded-lg border border-gray-300 p-2 text-sm" rows={2} value={config.prompt || 'Describe this image.'} onChange={(e) => handleChange('prompt', e.target.value)} placeholder="What to extract/describe..." />
                </div>
              )}
              {nodeType === 'summarize' && <Select label="Summary Length" value={config.length || 'short'} onChange={(val) => handleChange('length', val)} options={[{ label: 'Short (1 paragraph)', value: 'short' }, { label: 'Medium (3 paragraphs)', value: 'medium' }, { label: 'Long (Detailed)', value: 'long' }]} />}
              {nodeType === 'sentiment' && <Select label="Output Format" value={config.format || 'json'} onChange={(val) => handleChange('format', val)} options={[{ label: 'JSON Object', value: 'json' }, { label: 'Simple Text', value: 'text' }]} />}
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
