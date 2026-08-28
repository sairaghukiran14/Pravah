'use client';

import React from 'react';
import { NodeRunData, NodeType } from '@/types/pipeline';
import { 
  Mic, Languages, Volume2, PlayCircle, FileText, Brain, 
  Smile, Key, Tags, Monitor, Download, Mail, Link as LinkIcon, 
  HelpCircle, Clock, AlertTriangle, CheckCircle2, XCircle, RotateCcw,
  Sparkles, Coins
} from 'lucide-react';

interface TraceWaterfallProps {
  nodeRuns: NodeRunData[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  runStartedAt: string;
  runFinishedAt?: string | null;
}

const getNodeIcon = (type: string) => {
  switch (type) {
    case 'stt': return <Mic className="h-3.5 w-3.5 text-emerald-600" />;
    case 'translate': return <Languages className="h-3.5 w-3.5 text-blue-600" />;
    case 'tts': return <Volume2 className="h-3.5 w-3.5 text-orange-600" />;
    case 'podcast': return <PlayCircle className="h-3.5 w-3.5 text-rose-600" />;
    case 'ocr': return <FileText className="h-3.5 w-3.5 text-purple-600" />;
    case 'llm': return <Brain className="h-3.5 w-3.5 text-purple-600" />;
    case 'sentiment': return <Smile className="h-3.5 w-3.5 text-purple-600" />;
    case 'keyword_extraction': return <Key className="h-3.5 w-3.5 text-purple-600" />;
    case 'classification': return <Tags className="h-3.5 w-3.5 text-purple-600" />;
    case 'text_output': return <Monitor className="h-3.5 w-3.5 text-indigo-600" />;
    case 'audio_output': return <PlayCircle className="h-3.5 w-3.5 text-indigo-600" />;
    case 'file_output': return <Download className="h-3.5 w-3.5 text-indigo-600" />;
    case 'webhook': return <LinkIcon className="h-3.5 w-3.5 text-pink-600" />;
    case 'sms_sender': return <Mail className="h-3.5 w-3.5 text-pink-600" />;
    default: return <Sparkles className="h-3.5 w-3.5 text-gray-600" />;
  }
};

export const TraceWaterfall: React.FC<TraceWaterfallProps> = ({
  nodeRuns,
  selectedNodeId,
  onSelectNode,
  runStartedAt,
  runFinishedAt,
}) => {
  const baseStartTime = new Date(runStartedAt).getTime();
  const baseEndTime = runFinishedAt 
    ? new Date(runFinishedAt).getTime() 
    : Math.max(...nodeRuns.map(n => n.finishedAt ? new Date(n.finishedAt).getTime() : baseStartTime + (n.durationMs || 1000)), baseStartTime + 1000);
  
  const totalDurationMs = Math.max(baseEndTime - baseStartTime, 100);

  // Time grid markers
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
    pct: pct * 100,
    timeMs: Math.round(totalDurationMs * pct),
  }));

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Execution Waterfall & Span Timeline
          </h3>
        </div>
        <span className="text-xs font-mono font-medium text-gray-500">
          Total Span: {totalDurationMs}ms
        </span>
      </div>

      <div className="p-4 space-y-2 overflow-x-auto">
        {/* Time Scale Header */}
        <div className="relative h-6 border-b border-gray-200 ml-48 mr-4 mb-2">
          {ticks.map((tick, idx) => (
            <div
              key={idx}
              className="absolute top-0 flex flex-col items-center -translate-x-1/2"
              style={{ left: `${tick.pct}%` }}
            >
              <span className="text-[10px] font-mono text-gray-400">
                {tick.timeMs}ms
              </span>
              <div className="h-2 w-px bg-gray-200 mt-0.5" />
            </div>
          ))}
        </div>

        {/* Node Spans */}
        <div className="space-y-1.5 min-w-[650px]">
          {nodeRuns.map((nodeRun) => {
            const isSelected = selectedNodeId === nodeRun.nodeId;
            const nodeStart = nodeRun.startedAt ? new Date(nodeRun.startedAt).getTime() : baseStartTime;
            const nodeDuration = nodeRun.durationMs || (nodeRun.finishedAt ? new Date(nodeRun.finishedAt).getTime() - nodeStart : 0);
            
            const startOffsetMs = Math.max(0, nodeStart - baseStartTime);
            const leftPct = Math.min(100, Math.max(0, (startOffsetMs / totalDurationMs) * 100));
            const widthPct = Math.min(100 - leftPct, Math.max(2, (nodeDuration / totalDurationMs) * 100));

            const isFailed = nodeRun.status === 'failed';
            const isCompleted = nodeRun.status === 'completed';
            const isRunning = nodeRun.status === 'running';

            let barColor = 'bg-blue-500 border-blue-600 text-white';
            if (isCompleted) barColor = 'bg-emerald-500 border-emerald-600 text-white';
            if (isFailed) barColor = 'bg-rose-500 border-rose-600 text-white';
            if (nodeRun.status === 'skipped') barColor = 'bg-gray-300 border-gray-400 text-gray-700';

            return (
              <div
                key={nodeRun.id || nodeRun.nodeId}
                onClick={() => onSelectNode(nodeRun.nodeId)}
                className={`group flex items-center h-10 px-2 rounded-xl transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-50/80 border border-blue-200 shadow-2xs' 
                    : 'hover:bg-gray-50/80 border border-transparent'
                }`}
              >
                {/* Node Label & Info */}
                <div className="w-48 shrink-0 flex items-center gap-2 pr-3">
                  <div className="p-1 rounded-md bg-white border border-gray-200/80 shadow-2xs">
                    {getNodeIcon(nodeRun.nodeType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        {nodeRun.nodeId}
                      </span>
                      {nodeRun.retryCount !== undefined && nodeRun.retryCount > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-100 text-[9px] font-bold text-amber-800">
                          <RotateCcw className="h-2.5 w-2.5" /> {nodeRun.retryCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="uppercase font-mono">{nodeRun.nodeType}</span>
                      {nodeRun.cost !== undefined && nodeRun.cost > 0 && (
                        <span className="text-emerald-700 font-mono flex items-center gap-0.5">
                          <Coins className="h-2.5 w-2.5" />
                          {nodeRun.cost.toFixed(3)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timeline Bar Track */}
                <div className="flex-1 relative h-6 bg-gray-50/60 rounded-lg overflow-hidden border border-gray-100">
                  {/* Grid Lines */}
                  {ticks.map((tick, idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 w-px bg-gray-200/50"
                      style={{ left: `${tick.pct}%` }}
                    />
                  ))}

                  {/* Span Bar */}
                  <div
                    className={`absolute top-1 bottom-1 rounded-md shadow-2xs flex items-center px-2 text-[10px] font-mono font-medium transition-all ${barColor}`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      minWidth: '40px',
                    }}
                    title={`${nodeRun.nodeId} (${nodeRun.nodeType}): ${nodeDuration}ms`}
                  >
                    <span className="truncate">{nodeDuration}ms</span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="w-16 shrink-0 text-right pl-3">
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Done
                    </span>
                  )}
                  {isFailed && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600">
                      <XCircle className="h-3.5 w-3.5" /> Fail
                    </span>
                  )}
                  {isRunning && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 animate-pulse">
                      <Clock className="h-3.5 w-3.5" /> Run
                    </span>
                  )}
                  {nodeRun.status === 'skipped' && (
                    <span className="text-[11px] font-medium text-gray-400">
                      Skip
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
