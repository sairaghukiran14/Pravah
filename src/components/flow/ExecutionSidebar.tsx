'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { usePipelineStore } from '@/store/pipelineStore';
import { Badge } from '@/components/ui/Badge';
import { Terminal, FileText, GripVertical, X } from 'lucide-react';
import Link from 'next/link';
import { AudioPlayer } from '@/components/ui/AudioPlayer';

export const ExecutionSidebar: React.FC = () => {
  const isRunning = usePipelineStore((s) => s.isRunning);
  const executionLogs = usePipelineStore((s) => s.executionLogs);
  const nodeStatuses = usePipelineStore((s) => s.nodeStatuses);
  const nodeOutputs = usePipelineStore((s) => s.nodeOutputs);
  const nodes = usePipelineStore((s) => s.nodes);
  const pipelineId = usePipelineStore((s) => s.pipelineId);
  const resetExecution = usePipelineStore((s) => s.resetExecution);

  const [width, setWidth] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle resizing
  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const stopResizing = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isDragging) {
      // Calculate new width: viewport width - mouse X position
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth > 250 && newWidth < 800) {
        setWidth(newWidth);
      }
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isDragging, resize, stopResizing]);

  // Determine if it should be visible
  const isVisible = executionLogs.length > 0 || isRunning;

  const totalNodes = Object.keys(nodeStatuses).length;
  const completedNodes = Object.values(nodeStatuses).filter((st) => st === 'completed').length;
  const progressPercent = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  return (
    <div
      className={`transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden border-l border-gray-200 z-30 ${isVisible
          ? 'absolute md:relative right-0 top-0 bottom-0 h-full bg-white shadow-2xl md:shadow-none'
          : 'hidden md:block'
        }`}
      style={{
        width: isVisible ? (isMobile ? 'min(320px, 85vw)' : `${width}px`) : '0px',
        borderWidth: isVisible ? '1px' : '0px'
      }}
    >
      <aside
        className="relative flex-shrink-0 flex h-full bg-white min-w-0 w-full"
      >
        {/* Resize Handle */}
        {!isMobile && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400 active:bg-blue-500 z-10 transition-colors"
            onMouseDown={startResizing}
          />
        )}

        <div className="flex-1 flex flex-col h-full overflow-hidden ml-1">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">Execution Monitor</span>
              <Badge status={isRunning ? 'running' : 'completed'} />
            </div>
            <div className="flex items-center gap-2">
              {pipelineId && (
                <Link href={`/pipeline/${pipelineId}/history`} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium transition-colors">
                  <FileText className="h-3.5 w-3.5" />
                </Link>
              )}
              <button onClick={resetExecution} className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 h-1 shrink-0">
            <div className="h-full bg-gray-900 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 font-mono text-xs">
            {isRunning && (
              <div className="mb-4">
                <button
                  onClick={() => usePipelineStore.getState().cancelExecution()}
                  className="w-full text-center text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-2 rounded transition-colors"
                >
                  Cancel Pipeline Run
                </button>
              </div>
            )}

            <div className="space-y-2 mb-6">
              {executionLogs.map((log, idx) => (
                <div key={idx} className={`flex items-start gap-2 ${log.type === 'error' ? 'text-red-600' : log.type === 'success' ? 'text-emerald-600' : 'text-gray-600'}`}>
                  <span className="text-gray-400 text-[10px] select-none shrink-0">{log.time}</span>
                  <span className="break-words leading-relaxed">{log.message}</span>
                </div>
              ))}
            </div>

            {Object.keys(nodeOutputs).length > 0 && (
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <span className="text-[11px] text-gray-500 uppercase font-sans tracking-wider block font-semibold mb-2">Node Outputs</span>
                {Object.entries(nodeOutputs).map(([nodeId, output]) => {
                  const node = nodes.find((n) => n.id === nodeId);
                  const nodeLabel = (node?.data as any)?.label || nodeId;
                  return (
                    <div key={nodeId} className="p-3 rounded-lg bg-white border border-gray-200 shadow-sm flex flex-col gap-2">
                      <div>
                        <div className="flex justify-between items-baseline gap-2 mb-1.5  pb-1">
                          <span className="text-gray-900 font-semibold font-sans text-[13px]">{nodeLabel}</span>
                          <span className="text-[9px] text-gray-400 font-mono select-none lowercase">({node?.type || 'node'})</span>
                        </div>
                        <span className="text-gray-600 break-words whitespace-pre-wrap text-[13px] leading-relaxed">
                          {typeof output === 'string'
                            ? output
                            : (output.name ? `Uploaded file: ${output.name}` : null)
                            || output.response
                            || output.translated_text
                            || output.transcript
                            || output.text
                            || (output.url ? `File URL: ${output.url}` : null)
                            || 'Audio Output Generated'}
                        </span>
                      </div>
                      {typeof output !== 'string' && output.audio_r2_key ? (
                        <AudioPlayer src={`/api/audio/${output.audio_r2_key}`} className="mt-1" compact={true} />
                      ) : typeof output !== 'string' && output.audios && output.audios.length > 0 ? (
                        <AudioPlayer src={`data:audio/wav;base64,${output.audios[0]}`} className="mt-1" compact={true} />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
