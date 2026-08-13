'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Toolbar } from '@/components/flow/Toolbar';
import { FlowEditor } from '@/components/flow/FlowEditor';
import { ConfigPanel } from '@/components/flow/ConfigPanel';
import { RunDialog } from '@/components/flow/RunDialog';
import { NodeErrorDialog, type FailedNode } from '@/components/flow/NodeErrorDialog';
import { classifyNodeError } from '@/lib/api/nodeErrors';
import { ExecutionSidebar } from '@/components/flow/ExecutionSidebar';
import { usePipelineStore } from '@/store/pipelineStore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { NODE_DESCRIPTIONS } from '@/lib/nodeHelp';
import {
  ArrowLeft,
  Save,
  Play,
  History,
  CheckCircle2,
  Loader2,
  AlertCircle,
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
  const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);
  const [isUnconnectedNodeWarningOpen, setIsUnconnectedNodeWarningOpen] = useState(false);
  // Collected across the run: independent branches keep executing after one
  // fails, so a run can produce more than one failure to explain.
  const [failedNodes, setFailedNodes] = useState<FailedNode[]>([]);
  const [isNodeErrorDialogOpen, setIsNodeErrorDialogOpen] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [pipelineCost, setPipelineCost] = useState(0);

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

    // Pre-execution credit verification check
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const userData = await res.json();
        const credits = userData.credits ?? 0;

        // Calculate estimated cost for the current nodes in pipeline
        const { nodes } = usePipelineStore.getState();
        let cost = 0;
        for (const node of nodes) {
          if (node.type === 'stt') {
            cost += 0.375;
          } else if (node.type === 'translate') {
            cost += 0.05;
          } else if (node.type === 'tts') {
            cost += 0.05;
          } else if (node.type !== 'audio_input' && node.type !== 'audio_output' && node.type !== 'text_input' && node.type !== 'text_output') {
            cost += 0.50; // flat rate for other AI processing nodes
          }
        }

        if (credits < cost || credits <= 0) {
          setUserCredits(credits);
          setPipelineCost(cost);
          setIsCreditsDialogOpen(true);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to verify user credits, proceeding with pipeline run:', err);
    }

    await savePipeline();
    startExecution();
    window.dispatchEvent(new CustomEvent('credits-updated'));

    const abortController = new AbortController();
    setCancelExecutionCallback(() => abortController.abort());

    const { nodes, edges } = usePipelineStore.getState();

    // Upload any large binary data (audio/file) to R2 before sending
    const uploadBinaryToR2 = async (dataUri: string, name: string): Promise<{ url: string; key: string } | null> => {
      const base64Data = dataUri.split(',')[1];
      const mimeMatch = dataUri.match(/^data:([^;]+);/);
      const mime = mimeMatch?.[1] || 'audio/wav';
      const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: mime });
      const formData = new FormData();
      formData.append('file', blob, name || 'audio.wav');
      try {
        const res = await fetch('/api/audio/upload', { method: 'POST', body: formData });
        const result = await res.json();
        if (result.success && result.key) {
          return { url: result.url, key: result.key };
        }
      } catch (e) {
        console.warn('R2 upload failed, keeping data URI', e);
      }
      return null;
    };

    const serializedNodes = await Promise.all(nodes.map(async (n) => {
      const config = { ...((n.data.config as Record<string, any>) || {}) };
      
      // Upload audio_data.data if it's a base64 data URI
      if (config.audio_data?.data && typeof config.audio_data.data === 'string' && config.audio_data.data.startsWith('data:')) {
        const uploadRes = await uploadBinaryToR2(config.audio_data.data, config.audio_data.name || 'recording.wav');
        if (uploadRes) {
          config.audio_data = { ...config.audio_data, data: uploadRes.url, r2_key: uploadRes.key, url: uploadRes.url };
        }
      }
      // Upload file_data.data if it's a base64 data URI
      if (config.file_data?.data && typeof config.file_data.data === 'string' && config.file_data.data.startsWith('data:')) {
        const uploadRes = await uploadBinaryToR2(config.file_data.data, config.file_data.name || 'file');
        if (uploadRes) {
          config.file_data = { ...config.file_data, data: uploadRes.url, r2_key: uploadRes.key, url: uploadRes.url };
        }
      }

      return {
        id: n.id,
        type: n.type,
        label: (n.data.label as string) || n.type,
        positionX: n.position.x,
        positionY: n.position.y,
        config,
      };
    }));

    // Also upload any audio inputs from RunDialog
    const processedInputs = { ...inputs };
    for (const [key, value] of Object.entries(processedInputs)) {
      if (value && typeof value === 'object' && value.data && typeof value.data === 'string' && value.data.startsWith('data:')) {
        const uploadRes = await uploadBinaryToR2(value.data, value.name || 'input_audio.wav');
        if (uploadRes) {
          processedInputs[key] = { ...value, data: uploadRes.url, r2_key: uploadRes.key, url: uploadRes.url };
        }
      }
    }

    const serializedEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || null,
      targetHandle: e.targetHandle || null,
    }));

    try {
      const response = await fetch(`/api/pipelines/${pipelineId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: processedInputs, nodes: serializedNodes, edges: serializedEdges }),
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
            // Failures belong to one run; carrying them forward would show the
            // previous run's errors alongside this one's.
            setFailedNodes([]);
            setIsNodeErrorDialogOpen(false);
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

            // The server classifies the failure; fall back to classifying here
            // so an older stream still produces a readable dialog.
            const failure =
              eventData.failure ??
              classifyNodeError(eventData.error, eventData.nodeType || '');

            addExecutionLog(`❌ ${eventData.label || 'Node'} failed: ${failure.title}`, 'error');

            setFailedNodes((prev) => [
              ...prev,
              {
                nodeId: eventData.nodeId,
                label: eventData.label || eventData.nodeId,
                nodeType: eventData.nodeType || '',
                failure,
              },
            ]);
            setIsNodeErrorDialogOpen(true);
          } else if (eventType === 'node_skipped') {
            setNodeStatus(eventData.nodeId, 'skipped');
            addExecutionLog(`◽ Node Skipped: ${eventData.nodeId} (${eventData.reason})`, 'info');
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

  // Run Pipeline Auto-Bypass Logic
  const handleRunPipelineClick = () => {
    const { nodes, edges } = usePipelineStore.getState();
    
    // Validate if there are unconnected (free) nodes
    if (nodes.length > 1) {
      const connectedNodeIds = new Set(edges.flatMap(e => [e.source, e.target]));
      const freeNodes = nodes.filter(n => !connectedNodeIds.has(n.id));
      
      if (freeNodes.length > 0) {
        setIsUnconnectedNodeWarningOpen(true);
        return; // Halt execution
      }
    }

    const targetIds = new Set(edges.map((e) => e.target));
    const entryNodes = nodes.filter((n) => !targetIds.has(n.id));
    
    let allConfigured = true;
    const configuredInputs: Record<string, any> = {};

    for (const node of entryNodes) {
      const config = (node.data?.config as Record<string, any>) || {};
      
      if (node.type === 'text_input') {
        if (!config.text || config.text.trim() === '') {
          allConfigured = false; break;
        }
        configuredInputs[node.id] = config.text;
      } else if (node.type === 'audio_input') {
        if (config.input_type === 'url' && config.audio_url) {
          configuredInputs[node.id] = { type: 'audio', url: config.audio_url };
        } else if (config.audio_data) {
          configuredInputs[node.id] = config.audio_data;
        } else {
          allConfigured = false; break;
        }
      } else if (node.type === 'url_input') {
        if (!config.url || config.url.trim() === '') {
          allConfigured = false; break;
        }
        configuredInputs[node.id] = config.url;
      }
    }

    if (allConfigured && entryNodes.length > 0) {
      handleRunExecution(configuredInputs);
    } else {
      setIsRunDialogOpen(true);
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
              className="bg-transparent font-semibold text-xs sm:text-sm text-gray-900 focus:outline-none focus:bg-gray-50 px-1 sm:px-2 py-1 rounded transition-colors disabled:opacity-50 max-w-[120px] xs:max-w-[180px] sm:max-w-[280px] md:max-w-[380px] lg:max-w-[500px]"
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
              onClick={handleRunPipelineClick}
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

      {/* Insufficient Credits Dialog */}
      <Modal
        isOpen={isCreditsDialogOpen}
        onClose={() => setIsCreditsDialogOpen(false)}
        title="Insufficient Credits"
      >
        <div className="flex flex-col gap-4 text-center py-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-2">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 font-normal">
              You do not have enough credits to run this pipeline.
            </p>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-around text-sm mt-2">
              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-normal">Your Balance</span>
                <span className="text-base font-semibold text-red-600">₹{userCredits.toFixed(2)}</span>
              </div>
              <div className="w-px bg-gray-200" />
              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-normal">Estimated Cost</span>
                <span className="text-base font-semibold text-gray-900">₹{pipelineCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setIsCreditsDialogOpen(false)}>
              Cancel
            </Button>
            <Link href="/profile#billing">
              <Button variant="primary">
                Top Up Wallet
              </Button>
            </Link>
          </div>
        </div>
      </Modal>

      {/* Explains any node failure, including the provider-credit case this
          previously handled through a substring match on the error text. */}
      <NodeErrorDialog
        isOpen={isNodeErrorDialogOpen}
        onClose={() => setIsNodeErrorDialogOpen(false)}
        failures={failedNodes}
      />

      {/* Unconnected Nodes Warning Dialog */}
      <Modal
        isOpen={isUnconnectedNodeWarningOpen}
        onClose={() => setIsUnconnectedNodeWarningOpen(false)}
        title="Unconnected Nodes Detected"
      >
        <div className="flex flex-col gap-4 text-center py-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-2">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-700 font-medium">
              There are free/unconnected nodes on the canvas.
            </p>
            <p className="text-sm text-gray-500 font-normal">
              Only connected nodes can run in a pipeline. Please connect or remove the loose nodes before running.
            </p>
          </div>
          <div className="flex justify-center mt-4">
            <Button variant="primary" onClick={() => setIsUnconnectedNodeWarningOpen(false)}>
              Understood
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
