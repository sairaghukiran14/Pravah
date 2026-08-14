'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, Mic, Square, Paperclip, Send, Trash2, 
  Workflow, ArrowRight, CheckCircle2, Play, Info, Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
};

const encodeWAV = (samples: Float32Array, sampleRate: number): Blob => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);

  return new Blob([view], { type: 'audio/wav' });
};

interface AIPipelineBuilderProps {
  projectId: string;
  onClose: () => void;
  libraryPipelines: any[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  pipeline?: {
    name: string;
    description: string;
    nodes: any[];
    edges: any[];
  } | null;
}

export const AIPipelineBuilder: React.FC<AIPipelineBuilderProps> = ({
  projectId,
  onClose,
  libraryPipelines,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');

  // Manual Form States
  const [newPipeName, setNewPipeName] = useState('');
  const [newPipeDesc, setNewPipeDesc] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isCreatingManual, setIsCreatingManual] = useState(false);

  // AI Chat States
  const [chatHistory, setChatHistory] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am Pravah AI. Tell me what kind of data pipeline you want to build. You can write your requirements below, upload an audio requirement, or use the microphone button to explain it in your voice. E.g., "I want a pipeline that records Hindi speech, translates it to English, and saves it as audio."',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [speechLanguage, setSpeechLanguage] = useState('en-IN');
  
  const recordingContextRef = useRef<any>(null);
  const recordingTimeoutRef = useRef<any>(null);

  // Timer for Recording
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isSending]);

  // Helper: File/Blob to Base64
  const fileToBase64 = (fileOrBlob: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBlob);
    });
  };

  // Microphone Recording Controls
  const startRecording = async () => {
    setAudioBase64(null);
    setUploadedFileName(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      
      // 4096 buffer size, 1 input channel, 1 output channel
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];

      processor.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(inputBuffer));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      recordingContextRef.current = {
        stream,
        audioContext,
        processor,
        source,
        chunks,
      };
      setIsRecording(true);

      // Auto-stop recording at 5 minutes (300 seconds) to stay within 10MB limit
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 300000);
    } catch (err) {
      console.error('Microphone recording error:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    
    const ctx = recordingContextRef.current;
    if (ctx) {
      ctx.processor.disconnect();
      ctx.source.disconnect();
      ctx.audioContext.close().catch((err: any) => console.warn('Context close error:', err));
      ctx.stream.getTracks().forEach((track: any) => track.stop());

      // Flatten PCM Float32 chunks
      let totalLength = 0;
      for (const chunk of ctx.chunks) {
        totalLength += chunk.length;
      }
      const samples = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of ctx.chunks) {
        samples.set(chunk, offset);
        offset += chunk.length;
      }

      // Encode Int16 WAV Blob
      const wavBlob = encodeWAV(samples, 16000);
      fileToBase64(wavBlob).then((b64) => {
        setAudioBase64(b64);
        setUploadedFileName('voice_recording.wav');
      });

      recordingContextRef.current = null;
    }
    setIsRecording(false);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Audio file size exceeds the 10MB limit.');
      return;
    }

    try {
      const b64 = await fileToBase64(file);
      setAudioBase64(b64);
      setUploadedFileName(file.name);
    } catch (err) {
      console.error('File encoding error:', err);
    }
  };

  // Reset Audio
  const clearAudio = () => {
    setAudioBase64(null);
    setUploadedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Chat Submission handler
  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !audioBase64) return;

    const userMessageContent = inputText.trim() || `[Audio Uploaded: ${uploadedFileName}]`;
    const newChatHistory = [...chatHistory, { role: 'user', content: userMessageContent } as Message];
    setChatHistory(newChatHistory);
    setInputText('');
    clearAudio();
    setIsSending(true);

    try {
      const res = await fetch('/api/pipelines/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          description: inputText.trim(),
          audio: audioBase64 || undefined,
          languageCode: speechLanguage,
          chatHistory: chatHistory.slice(1).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.message,
            pipeline: data.pipeline || null,
          },
        ]);
      } else {
        const errData = await res.json();
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Error: ${errData.error || 'Failed to process pipeline request.'}`,
          },
        ]);
      }
    } catch (err) {
      console.error('Error generating pipeline:', err);
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I encountered a connection error. Please try again.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Save Pipeline Handler
  const handleApprovePipeline = async (pipeline: any) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const res = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pipeline.name,
          description: pipeline.description || 'Generated by Pravah AI',
          projectId,
          nodes: pipeline.nodes,
          edges: pipeline.edges,
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        onClose();
        router.push(`/pipeline/${saved.id}`);
      } else {
        const err = await res.json();
        alert(`Failed to save pipeline: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error saving custom pipeline:', err);
      alert('Network error while saving pipeline.');
    } finally {
      setIsSaving(false);
    }
  };

  // Manual Form Submission
  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipeName.trim() || isCreatingManual) return;

    setIsCreatingManual(true);
    try {
      const res = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPipeName,
          description: newPipeDesc,
          projectId,
          cloneFromId: selectedTemplateId || undefined,
        }),
      });

      if (res.ok) {
        const createdPipeline = await res.json();
        onClose();
        router.push(`/pipeline/${createdPipeline.id}`);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to create pipeline'}`);
      }
    } catch (err) {
      console.error('Error creating pipeline:', err);
    } finally {
      setIsCreatingManual(false);
    }
  };

  return (
    <div className="flex flex-col h-[520px] max-h-[80vh] min-w-0 bg-white">
      {/* Navigation tabs */}
      <div className="flex border-b border-gray-100 pb-3 mb-4 shrink-0">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'ai'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <img src="/logo.png" alt="Pravah Logo" className="h-4 w-4 object-contain rounded-[20%] shrink-0" /> AI Conversational Builder
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'manual'
              ? 'bg-gray-100 text-gray-800'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Workflow className="h-4 w-4" /> Manual Setup
        </button>
      </div>

      {/* Manual Setup Form Panel */}
      {activeTab === 'manual' && (
        <form onSubmit={handleCreateManual} className="space-y-4 overflow-y-auto pr-1 flex-1 py-1">
          <Input
            label="Pipeline Name"
            placeholder="e.g. Marathi Audio Transcriber & Translater"
            value={newPipeName}
            onChange={(e) => setNewPipeName(e.target.value)}
            disabled={isCreatingManual}
            required
          />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 disabled:opacity-50"
              placeholder="What does this pipeline execute?"
              value={newPipeDesc}
              onChange={(e) => setNewPipeDesc(e.target.value)}
              disabled={isCreatingManual}
            />
          </div>

          {libraryPipelines.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Start from Template (Optional)
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 disabled:opacity-50 cursor-pointer"
                value={selectedTemplateId}
                onChange={(e) => {
                  setSelectedTemplateId(e.target.value);
                  const template = libraryPipelines.find((p) => p.id === e.target.value);
                  if (template) {
                    if (!newPipeName || newPipeName.startsWith('Clone of ') || newPipeName === '') {
                      setNewPipeName(`Clone of ${template.name}`);
                    }
                    setNewPipeDesc(template.description || '');
                  }
                }}
                disabled={isCreatingManual}
              >
                <option value="">Start with an Empty Canvas</option>
                {libraryPipelines.map((pipe) => (
                  <option key={pipe.id} value={pipe.id}>
                    {pipe.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isCreatingManual}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isCreatingManual}
              disabled={isCreatingManual}
              icon={<Workflow className="h-4 w-4" />}
            >
              Open in Canvas
            </Button>
          </div>
        </form>
      )}

      {/* AI Conversational Builder Panel */}
      {activeTab === 'ai' && (
        <div className="flex flex-col flex-1 min-h-0 bg-gray-50/50 rounded-xl border border-gray-200/80 overflow-hidden">
          
          {/* Chat message logs */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {chatHistory.map((msg, index) => {
              const isAssistant = msg.role === 'assistant';
              const pipeline = msg.pipeline;
              return (
                <div key={index} className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'} max-w-full`}>
                  <div className={`flex items-start gap-2 max-w-[85%]`}>
                    {isAssistant && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 mt-0.5">
                        <img src="/logo.png" alt="Pravah Logo" className="h-4 w-4 object-contain rounded-[20%]" />
                      </div>
                    )}
                    <div className="space-y-3">
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                          isAssistant
                            ? 'bg-white text-gray-800 border border-gray-200/80 rounded-tl-xs'
                            : 'bg-gray-900 text-white rounded-tr-xs'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Display generated Pipeline Preview if present */}
                      {isAssistant && pipeline && (() => {
                        // Group nodes into columns based on X coordinate range
                        const columns: any[][] = [];
                        const sorted = [...pipeline.nodes].sort((a, b) => (a.positionX ?? a.x ?? 0) - (b.positionX ?? b.x ?? 0));
                        
                        for (const node of sorted) {
                          const x = node.positionX ?? node.x ?? 0;
                          let foundCol = columns.find(col => {
                            const colX = col[0].positionX ?? col[0].x ?? 0;
                            return Math.abs(colX - x) < 120;
                          });
                          
                          if (foundCol) {
                            foundCol.push(node);
                          } else {
                            columns.push([node]);
                          }
                        }
                        
                        columns.sort((a, b) => {
                          const ax = a.reduce((sum, n) => sum + (n.positionX ?? n.x ?? 0), 0) / a.length;
                          const bx = b.reduce((sum, n) => sum + (n.positionX ?? n.x ?? 0), 0) / b.length;
                          return ax - bx;
                        });

                        for (const col of columns) {
                          col.sort((a, b) => (a.positionY ?? a.y ?? 0) - (b.positionY ?? b.y ?? 0));
                        }

                        return (
                          <div className="bg-white border border-gray-200/90 rounded-xl p-4 shadow-sm max-w-full space-y-3 overflow-hidden">
                            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                              <div className="p-1 rounded-md bg-indigo-50 text-indigo-600">
                                <Workflow className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-gray-900">{pipeline.name}</h4>
                                <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{pipeline.description}</p>
                              </div>
                            </div>

                            {/* Node visual sequence flow with columns */}
                            <div className="flex items-center gap-4 overflow-x-auto py-3 px-3 bg-gray-50/50 rounded-xl border border-gray-200/70 min-w-0 max-w-full">
                              {columns.map((col, colIdx) => (
                                <React.Fragment key={colIdx}>
                                  <div className="flex flex-col gap-2.5 shrink-0 justify-center">
                                    {col.map((node, nodeIdx) => (
                                      <div key={nodeIdx} className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-white border border-gray-200 shadow-2xs hover:border-indigo-200 transition-colors">
                                        <span className="text-[10px] font-semibold text-gray-800">{node.label || node.type}</span>
                                        {node.config?.language_code && (
                                          <span className="text-[8px] font-mono bg-gray-100 px-1 rounded text-indigo-600 font-medium">{node.config.language_code}</span>
                                        )}
                                        {node.config?.target_language_code && (
                                          <span className="text-[8px] font-mono bg-gray-100 px-1 rounded text-indigo-600 font-medium">➜{node.config.target_language_code}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  {colIdx < columns.length - 1 && (
                                    <ArrowRight className="h-4 w-4 text-gray-300 shrink-0 self-center" />
                                  )}
                                </React.Fragment>
                              ))}
                            </div>

                            <div className="flex items-center justify-between gap-4 pt-1">
                              <span className="text-[9px] text-emerald-600 font-medium flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> AI layout built successfully
                              </span>
                              <Button
                                onClick={() => handleApprovePipeline(pipeline)}
                                disabled={isSaving}
                                isLoading={isSaving}
                                size="sm"
                                icon={<Workflow className="h-3.5 w-3.5" />}
                                className="text-xs py-1 px-3 bg-indigo-600 hover:bg-indigo-700 shadow-xs"
                              >
                                Approve & Create
                              </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 animate-pulse">
                  <img src="/logo.png" alt="Pravah Logo" className="h-4 w-4 object-contain rounded-[20%]" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2.5 text-xs text-gray-400 shadow-2xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                  <span>Pravah AI is configuring your pipeline...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Audio attachments indicators */}
          {uploadedFileName && (
            <div className="mx-4 mb-2 p-2 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-between text-xs shrink-0">
              <span className="flex items-center gap-1.5 font-medium text-indigo-700">
                <Mic className="h-3.5 w-3.5" /> Requirement Audio: {uploadedFileName}
              </span>
              <button
                type="button"
                onClick={clearAudio}
                className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Form input bar */}
          <form onSubmit={handleSendPrompt} className="p-3 border-t border-gray-200/60 bg-white flex items-center gap-2 shrink-0">
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            
            {/* Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || isRecording}
              title="Upload audio file of requirements"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {/* Mic Recording Controls */}
            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 animate-pulse text-xs font-semibold cursor-pointer shrink-0"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Recording {formatDuration(recordingDuration)}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isSending}
                  title="Record requirements using microphone"
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <select
                  value={speechLanguage}
                  onChange={(e) => setSpeechLanguage(e.target.value)}
                  disabled={isSending}
                  title="Select Speaking Language"
                  className="text-[10px] text-gray-500 bg-transparent border border-gray-200 rounded-md py-1 px-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-900"
                >
                  <option value="en-IN">EN</option>
                  <option value="hi-IN">HI</option>
                  <option value="te-IN">TE</option>
                  <option value="ta-IN">TA</option>
                  <option value="bn-IN">BN</option>
                  <option value="kn-IN">KN</option>
                  <option value="mr-IN">MR</option>
                </select>
              </div>
            )}

            <input
              type="text"
              placeholder={isRecording ? "Listening to requirement..." : "Describe the data flow / pipeline details..."}
              className="flex-1 px-3.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSending || isRecording}
            />

            <button
              type="submit"
              disabled={isSending || isRecording || (!inputText.trim() && !audioBase64)}
              className="p-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-gray-900 transition-colors cursor-pointer shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
