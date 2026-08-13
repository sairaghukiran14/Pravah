'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Play, Sparkles, Mic, Square, Upload } from 'lucide-react';
import { usePipelineStore } from '@/store/pipelineStore';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { normalizeToWav, blobToDataUrl } from '@/lib/audio/normalize';

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
  const [recordingDurations, setRecordingDurations] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  
  const mediaRecorders = useRef<Record<string, MediaRecorder | null>>({});
  const audioChunks = useRef<Record<string, Blob[]>>({});
  const timerIntervals = useRef<Record<string, NodeJS.Timeout | null>>({});

  const handleInputChange = (nodeId: string, value: any) => {  
    setInputs((prev) => ({ ...prev, [nodeId]: value }));
  };

  const startRecording = async (nodeId: string) => {
    try {
      setRecordingDurations((prev) => ({ ...prev, [nodeId]: 0 }));
      setIsProcessing((prev) => ({ ...prev, [nodeId]: false }));

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorders.current[nodeId] = recorder;
      audioChunks.current[nodeId] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current[nodeId].push(e.data);
        }
      };

      recorder.onstop = async () => {
        setIsProcessing((prev) => ({ ...prev, [nodeId]: true }));
        const recorded = new Blob(audioChunks.current[nodeId], { type: 'audio/webm' });

        try {
          // WebM cannot be split into the 30s segments Sarvam's endpoint
          // requires, so it is converted to WAV here while a decoder is at hand.
          const { blob, durationSeconds } = await normalizeToWav(recorded);
          handleInputChange(nodeId, {
            type: 'audio',
            data: await blobToDataUrl(blob),
            url: URL.createObjectURL(blob),
            durationSeconds,
          });
        } catch (err) {
          console.error('Could not process the recording', err);
          alert(
            err instanceof Error ? err.message : 'Could not process the recording'
          );
        } finally {
          setIsProcessing((prev) => ({ ...prev, [nodeId]: false }));
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording((prev) => ({ ...prev, [nodeId]: true }));

      // Setup duration timer
      if (timerIntervals.current[nodeId]) {
        clearInterval(timerIntervals.current[nodeId]!);
      }
      timerIntervals.current[nodeId] = setInterval(() => {
        setRecordingDurations((prev) => ({ ...prev, [nodeId]: (prev[nodeId] || 0) + 1 }));
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = (nodeId: string) => {
    if (timerIntervals.current[nodeId]) {
      clearInterval(timerIntervals.current[nodeId]!);
      timerIntervals.current[nodeId] = null;
    }
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
                          {isProcessing[node.id] ? (
                            <div className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-lg bg-white">
                              <span className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></span>
                              <span className="text-xs text-gray-500 font-medium">Processing recording...</span>
                            </div>
                          ) : !inputs[node.id] ? (
                            <div className="flex flex-col gap-2.5">
                              {isRecording[node.id] && (
                                <div className="flex items-center justify-center gap-2 py-1.5 bg-red-50 border border-red-100 rounded-lg animate-pulse">
                                  <span className="h-2.5 w-2.5 rounded-full bg-red-600"></span>
                                  <span className="text-xs font-mono font-bold text-red-600">
                                    Recording: {((secs = 0) => {
                                      const duration = recordingDurations[node.id] || 0;
                                      const m = Math.floor(duration / 60).toString().padStart(2, '0');
                                      const s = (duration % 60).toString().padStart(2, '0');
                                      return `${m}:${s}`;
                                    })()}
                                  </span>
                                </div>
                              )}
                              <Button 
                                type="button"
                                variant={isRecording[node.id] ? "danger" : "secondary"} 
                                size="sm" 
                                className="w-full justify-center py-6 cursor-pointer"
                                onClick={() => isRecording[node.id] ? stopRecording(node.id) : startRecording(node.id)}
                                icon={isRecording[node.id] ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
                              >
                                {isRecording[node.id] ? 'Stop Recording' : 'Start Recording'}
                              </Button>
                            </div>
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
                           <span className="text-xs text-gray-400 mt-1">MP3, WAV, M4A — long recordings are transcribed in full</span>
                           <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="audio/*" onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if (!file) return;
                             setIsProcessing((prev) => ({ ...prev, [node.id]: true }));
                             try {
                               // Converted up front so the server can split it
                               // into the 30s segments Sarvam's endpoint needs.
                               const { blob, durationSeconds } = await normalizeToWav(file);
                               handleInputChange(node.id, {
                                 type: 'audio',
                                 data: await blobToDataUrl(blob),
                                 name: file.name,
                                 durationSeconds,
                               });
                             } catch (err) {
                               console.error('Could not read the audio file', err);
                               alert(err instanceof Error ? err.message : 'Could not read the audio file');
                             } finally {
                               setIsProcessing((prev) => ({ ...prev, [node.id]: false }));
                             }
                           }} />
                           {inputs[node.id]?.name && <div className="mt-2 text-xs font-semibold text-emerald-600">Selected: {inputs[node.id].name}</div>}
                        </div>
                      )}

                      {inputType === 'url' && (
                         <input type="url" placeholder="https://example.com/audio.mp3" className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-gray-900 focus:outline-none" onChange={(e) => handleInputChange(node.id, e.target.value)} required />
                      )}
                    </div>
                  ) : node.type === 'image_input' ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-white text-center hover:bg-gray-50 transition cursor-pointer relative">
                       <Upload className="h-6 w-6 text-gray-400 mb-2" />
                       <span className="text-sm text-gray-600 font-medium">Click to upload image</span>
                       <span className="text-xs text-gray-400 mt-1">PNG, JPG, JPEG up to 10MB</span>
                       <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                           const reader = new FileReader();
                           reader.readAsDataURL(file);
                           reader.onload = () => handleInputChange(node.id, { type: 'image', data: reader.result, name: file.name, url: URL.createObjectURL(file) });
                         }
                       }} required={!inputs[node.id]} />
                       {inputs[node.id]?.name && <div className="mt-2 text-xs font-semibold text-emerald-600">Selected: {inputs[node.id].name}</div>}
                    </div>
                  ) : node.type === 'video_input' ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-white text-center hover:bg-gray-50 transition cursor-pointer relative">
                       <Upload className="h-6 w-6 text-gray-400 mb-2" />
                       <span className="text-sm text-gray-600 font-medium">Click to upload video</span>
                       <span className="text-xs text-gray-400 mt-1">MP4, WebM up to 50MB</span>
                       <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="video/*" onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                           const reader = new FileReader();
                           reader.readAsDataURL(file);
                           reader.onload = () => handleInputChange(node.id, { type: 'video', data: reader.result, name: file.name, url: URL.createObjectURL(file) });
                         }
                       }} required={!inputs[node.id]} />
                       {inputs[node.id]?.name && <div className="mt-2 text-xs font-semibold text-emerald-600">Selected: {inputs[node.id].name}</div>}
                    </div>
                  ) : node.type === 'document_input' ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-white text-center hover:bg-gray-50 transition cursor-pointer relative">
                       <Upload className="h-6 w-6 text-gray-400 mb-2" />
                       <span className="text-sm text-gray-600 font-medium">Click to upload document</span>
                       <span className="text-xs text-gray-400 mt-1">PDF, TXT, DOCX up to 10MB</span>
                       <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.txt,.docx" onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                           const reader = new FileReader();
                           reader.readAsDataURL(file);
                           reader.onload = () => handleInputChange(node.id, { type: 'document', data: reader.result, name: file.name, url: URL.createObjectURL(file) });
                         }
                       }} required={!inputs[node.id]} />
                       {inputs[node.id]?.name && <div className="mt-2 text-xs font-semibold text-emerald-600">Selected: {inputs[node.id].name}</div>}
                    </div>
                  ) : node.type === 'url_input' ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">URL Link</label>
                      <input type="url" placeholder="https://example.com/..." className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-gray-900 focus:outline-none" value={inputs[node.id] || ''} onChange={(e) => handleInputChange(node.id, e.target.value)} required />
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
