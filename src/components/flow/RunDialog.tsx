'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Play, Sparkles, Mic, Square, Upload } from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';
import { AudioPlayer } from '@/components/ui/AudioPlayer';

interface RunDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmRun: (inputs: Record<string, any>) => void;  
}

export const RunDialog: React.FC<RunDialogProps> = ({ isOpen, onClose, onConfirmRun }) => {
  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);

  const entryNodes = useMemo(() => {
    const targetIds = new Set(edges.map((e) => e.target));
    return nodes.filter((n) => !targetIds.has(n.id));
  }, [nodes, edges]);

  const [inputs, setInputs] = useState<Record<string, any>>({});  
  const [isRecording, setIsRecording] = useState<Record<string, boolean>>({});
  const mediaRecorders = useRef<Record<string, MediaRecorder | null>>({});
  const audioChunks = useRef<Record<string, Blob[]>>({});

  const handleInputChange = (nodeId: string, value: any) => {  
    setInputs((prev) => ({ ...prev, [nodeId]: value }));
  };

  const startRecording = async (nodeId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorders.current[nodeId] = recorder;
      audioChunks.current[nodeId] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current[nodeId].push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunks.current[nodeId], { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(blob);
        
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result;
          handleInputChange(nodeId, { type: 'audio', data: base64data, url: audioUrl });
        };
        
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording((prev) => ({ ...prev, [nodeId]: true }));
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = (nodeId: string) => {
    if (mediaRecorders.current[nodeId]) {
      mediaRecorders.current[nodeId]?.stop();
      setIsRecording((prev) => ({ ...prev, [nodeId]: false }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmRun(inputs);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Run Pipeline">
      <form onSubmit={handleSubmit} className="space-y-6">
        <p className="text-sm text-gray-500">Provide inputs for the pipeline entry nodes.</p>
        
        {entryNodes.length === 0 ? (
           <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded font-medium border border-amber-200">
             No entry nodes found. Please check your pipeline connections.
           </p>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {entryNodes.map((node) => {
              const config = node.data.config as Record<string, any>;  
              const inputType = node.type === 'audio_input' 
                ? (config?.input_type || 'upload')
                : (config?.input_type || 'text');

              return (
                <div key={node.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <h4 className="font-medium text-sm text-gray-900">{node.data.label as string}</h4>
                  </div>
                  
                  {node.type === 'audio_input' ? (
                    <div>
                      {inputType === 'mic' && (
                        <div className="flex flex-col gap-2">
                          {!inputs[node.id] ? (
                            <Button 
                              type="button"
                              variant={isRecording[node.id] ? "danger" : "secondary"} 
                              size="sm" 
                              className="w-full justify-center py-6"
                              onClick={() => isRecording[node.id] ? stopRecording(node.id) : startRecording(node.id)}
                              icon={isRecording[node.id] ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            >
                              {isRecording[node.id] ? 'Stop Recording' : 'Start Recording'}
                            </Button>
                          ) : (
                            <div className="flex flex-col gap-2 w-full">
                              <AudioPlayer src={inputs[node.id].url} compact={true} />
                              <div className="flex justify-end">
                                <button type="button" onClick={() => handleInputChange(node.id, null)} className="text-xs text-red-600 font-semibold hover:text-red-700 bg-red-50 hover:bg-red-100/85 px-2.5 py-1 rounded transition-colors cursor-pointer">Retake</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {inputType === 'upload' && (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-white text-center hover:bg-gray-50 transition cursor-pointer relative">
                           <Upload className="h-6 w-6 text-gray-400 mb-2" />
                           <span className="text-sm text-gray-600 font-medium">Click to upload audio</span>
                           <span className="text-xs text-gray-400 mt-1">MP3, WAV, M4A up to 10MB</span>
                           <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="audio/*" onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               const reader = new FileReader();
                               reader.readAsDataURL(file);
                               reader.onload = () => handleInputChange(node.id, { type: 'audio', data: reader.result, name: file.name });
                             }
                           }} />
                           {inputs[node.id]?.name && <div className="mt-2 text-xs font-semibold text-emerald-600">Selected: {inputs[node.id].name}</div>}
                        </div>
                      )}

                      {inputType === 'url' && (
                         <input type="url" placeholder="https://example.com/audio.mp3" className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-gray-900 focus:outline-none" onChange={(e) => handleInputChange(node.id, e.target.value)} required />
                      )}
                    </div>
                  ) : (
                    <div>
                      {/* Default text input for generic nodes */}
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-gray-600">Text Input</label>
                        <button type="button" onClick={() => handleInputChange(node.id, 'नमस्ते! भारत की कृत्रिम बुद्धिमत्ता सर्वम एआई पाइपलाइन में आपका स्वागत है।')}
                          className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Sample Hindi
                        </button>
                      </div>
                      <textarea rows={3} value={inputs[node.id] || ''} onChange={(e) => handleInputChange(node.id, e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900" placeholder="Type input text here..." required={!inputs[node.id]} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 mt-2">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit" icon={<Play className="h-4 w-4 fill-current" />} disabled={entryNodes.length === 0}>
            Run Pipeline
          </Button>
        </div>
      </form>
    </Modal>
  );
};
