'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Toolbar } from '@/components/flow/Toolbar';
import { FlowEditor } from '@/components/flow/FlowEditor';
import { ConfigPanel } from '@/components/flow/ConfigPanel';
import { RunDialog } from '@/components/flow/RunDialog';
import { ExecutionSidebar } from '@/components/flow/ExecutionSidebar';
import { usePipelineStore } from '@/store/pipelineStore';
import { Button } from '@/components/ui/Button';
import { NODE_DESCRIPTIONS } from '@/lib/nodeHelp';
import {
  ArrowLeft,
  Save,
  Play,
  History,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export default function PipelineEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: pipelineId } = use(params);

  const [isLoading, setIsLoading] = useState(true);
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const pipelineName = usePipelineStore((s) => s.pipelineName);
  const setPipelineName = usePipelineStore((s) => s.setPipelineName);
  const projectId = usePipelineStore((s) => s.projectId);
  const loadPipeline = usePipelineStore((s) => s.loadPipeline);
  const savePipeline = usePipelineStore((s) => s.savePipeline);
  const isDirty = usePipelineStore((s) => s.isDirty);
  const isSaving = usePipelineStore((s) => s.isSaving);
  const isRunning = usePipelineStore((s) => s.isRunning);
  const hoveredNodeType = usePipelineStore((s) => s.hoveredNodeType);

  const startExecution = usePipelineStore((s) => s.startExecution);
  const setNodeStatus = usePipelineStore((s) => s.setNodeStatus);
  const setNodeOutput = usePipelineStore((s) => s.setNodeOutput);
  const addExecutionLog = usePipelineStore((s) => s.addExecutionLog);
  const finishExecution = usePipelineStore((s) => s.finishExecution);

  // Load pipeline data on mount
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/pipelines/${pipelineId}`);
        if (res.ok) {
          const data = await res.json();
          loadPipeline(data);
        }
      } catch (err) {
        console.error('Error fetching pipeline:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [pipelineId, loadPipeline]);

  // Save Pipeline Handler
  const handleSave = async () => {
    if (isSaving || isRunning) return;
    const ok = await savePipeline();
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const setCancelExecutionCallback = usePipelineStore((s) => s.setCancelExecutionCallback);

  // Real-Time Server-Sent Events (SSE) Execution Handler
  const handleRunExecution = async (inputs: Record<string, any>) => {
    if (isRunning) return;
    await savePipeline();
    startExecution();
    window.dispatchEvent(new CustomEvent('credits-updated'));

    const abortController = new AbortController();
    setCancelExecutionCallback(() => abortController.abort());

    try {
      const response = await fetch(`/api/pipelines/${pipelineId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const chunk of lines) {
          if (!chunk.trim()) continue;

          let eventType = 'message';
          let eventData: any = {};

          const chunkLines = chunk.split('\n');
          for (const line of chunkLines) {
            if (line.startsWith('event: ')) {
              eventType = line.substring(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                eventData = JSON.parse(line.substring(6).trim());
              } catch (e) {}
            }
          }

          if (eventType === 'run_started') {
            addExecutionLog(`▶ Pipeline Run #${eventData.runId?.substring(0, 8)} initialized`, 'info');
          } else if (eventType === 'node_started') {
            setNodeStatus(eventData.nodeId, 'running');
            addExecutionLog(`⏳ Executing Node: ${eventData.label} (${eventData.nodeType})...`, 'info');
          } else if (eventType === 'node_completed') {
            setNodeStatus(eventData.nodeId, 'completed');
            setNodeOutput(eventData.nodeId, eventData.output);
            addExecutionLog(
              `✅ Node Completed in ${eventData.durationMs}ms: ${JSON.stringify(eventData.output).substring(0, 70)}...`,
              'success'
            );
          } else if (eventType === 'node_failed') {
            setNodeStatus(eventData.nodeId, 'failed');
            addExecutionLog(`❌ Node Failed: ${eventData.error}`, 'error');
          } else if (eventType === 'run_completed') {
            finishExecution(eventData.runId, eventData.status);
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted');
      } else {
        console.error('SSE Stream Error:', err);
        addExecutionLog(`Execution error: ${err.message}`, 'error');
        finishExecution('err', 'failed');
      }
    } finally {
      setCancelExecutionCallback(null);
      window.dispatchEvent(new CustomEvent('credits-updated'));
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden font-sans">
      <Navbar />

      {/* Editor Sub-Header Toolbar */}
      <div className="h-14 border-b border-gray-200 bg-white px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href={projectId ? `/dashboard/project/${projectId}` : '/dashboard'}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="h-4 w-px bg-gray-200" />

          {/* Editable Pipeline Name */}
          <div className="flex items-center gap-1 sm:gap-2">
            <input
              type="text"
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              disabled={isSaving || isRunning}
              className="bg-transparent font-semibold text-xs sm:text-sm text-gray-900 focus:outline-none focus:bg-gray-50 px-1 sm:px-2 py-1 rounded transition-colors disabled:opacity-50 max-w-[80px] sm:max-w-[150px] md:max-w-none"
            />
            {isDirty && (
              <span className="text-[9px] sm:text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 sm:px-2 py-0.5 rounded-full font-medium shrink-0">
                <span className="hidden sm:inline">Unsaved Changes</span>
                <span className="sm:hidden">Unsaved</span>
              </span>
            )}
            {saveSuccess && (
              <span className="text-[9px] sm:text-[10px] text-emerald-600 flex items-center gap-0.5 sm:gap-1 font-medium shrink-0">
                <CheckCircle2 className="h-3 w-3" /> <span className="hidden sm:inline">Saved!</span>
              </span>
            )}
          </div>
        </div>

        {/* Hovered Node Info in Visual Editor Top Bar */}
        <div className="hidden md:flex flex-1 justify-center max-w-2xl mx-6">
          {hoveredNodeType && NODE_DESCRIPTIONS[hoveredNodeType] ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-50 border border-gray-200 text-xs shadow-2xs max-w-full tooltip-fade">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
              <span className="font-semibold text-gray-800 shrink-0">
                {NODE_DESCRIPTIONS[hoveredNodeType].title}:
              </span>
              <span className="text-gray-600">
                {NODE_DESCRIPTIONS[hoveredNodeType].desc}
              </span>
            </div>
          ) : (
            <div className="text-gray-400 text-xs italic font-normal select-none">
              Hover over any node in the toolbar to see its description here
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href={`/pipeline/${pipelineId}/history`}>
            <Button
              variant="ghost"
              size="sm"
              icon={<History className="h-4 w-4 text-gray-500" />}
              disabled={isRunning || isSaving}
            >
              <span className="hidden sm:inline">History</span>
            </Button>
          </Link>

          <Button
            variant="secondary"
            size="sm"
            isLoading={isSaving}
            disabled={isSaving || isRunning}
            onClick={handleSave}
            icon={<Save className="h-4 w-4 text-gray-600" />}
          >
            <span className="hidden sm:inline">Save Pipeline</span>
          </Button>

          {isRunning ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => usePipelineStore.getState().cancelExecution()}
              icon={<Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
            >
              <span className="hidden sm:inline">Cancel Run</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              disabled={isSaving}
              onClick={() => setIsRunDialogOpen(true)}
              icon={<Play className="h-4 w-4 fill-current text-white" />}
            >
              <span className="hidden sm:inline">Run Pipeline</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Workspace Area (Toolbar + Canvas + Config Panel) */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-gray-50">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500 text-sm">
            <Loader2 className="h-6 w-6 animate-spin text-gray-900" />
            <span>Loading visual node editor canvas...</span>
          </div>
        ) : (
          <>
            <Toolbar />
            <div className="flex-1 flex relative overflow-hidden">
              <ConfigPanel />
              <FlowEditor />
              <ExecutionSidebar />
            </div>
          </>
        )}
      </div>

      {/* Run Input Prompt Modal */}
      <RunDialog
        isOpen={isRunDialogOpen}
        onClose={() => setIsRunDialogOpen(false)}
        onConfirmRun={handleRunExecution}
      />
    </div>
  );
}
