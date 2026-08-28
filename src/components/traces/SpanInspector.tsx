'use client';

import React, { useState } from 'react';
import { NodeRunData } from '@/types/pipeline';
import { 
  Copy, Check, FileCode, Layers, Activity, AlertCircle, 
  Coins, Clock, RotateCcw, Volume2, ArrowDownRight, Sparkles,
  Zap, Info, CornerDownRight
} from 'lucide-react';
import { AudioPlayer } from '@/components/ui/AudioPlayer';

interface SpanInspectorProps {
  nodeRun: NodeRunData | null;
  allNodes?: any[];
}

export const SpanInspector: React.FC<SpanInspectorProps> = ({ nodeRun, allNodes }) => {
  const [activeTab, setActiveTab] = useState<'output' | 'input' | 'metrics' | 'error'>('output');
  const [copied, setCopied] = useState<string | null>(null);

  if (!nodeRun) {
    return (
      <div className="rounded-2xl border border-gray-200/80 bg-white p-8 text-center space-y-3 shadow-xs">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900">No Span Selected</h4>
          <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">
            Click on any node in the waterfall timeline or node graph to inspect its latency, tokens, cost, and I/O snapshots.
          </p>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const isFailed = nodeRun.status === 'failed';
  const audioR2Key = nodeRun.output && (nodeRun.output as any).audio_r2_key;
  const audioBase64 = nodeRun.output && (nodeRun.output as any).audios?.[0];
  const audioUrl = nodeRun.output && ((nodeRun.output as any).url || (nodeRun.output as any).file);

  const inputAudio = nodeRun.input?.payload?.data || nodeRun.input?.payload?.file || nodeRun.input?.file;

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white shadow-xs overflow-hidden flex flex-col">
      {/* Span Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border ${
            isFailed 
              ? 'bg-rose-50 border-rose-200 text-rose-600' 
              : 'bg-blue-50 border-blue-200 text-blue-600'
          }`}>
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">{nodeRun.nodeId}</h3>
              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-mono uppercase font-semibold">
                {nodeRun.nodeType}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                nodeRun.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                nodeRun.status === 'failed' ? 'bg-rose-100 text-rose-800' :
                nodeRun.status === 'running' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                'bg-gray-100 text-gray-600'
              }`}>
                {nodeRun.status}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
              Span ID: {nodeRun.id}
            </p>
          </div>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-2.5 py-1 rounded-lg bg-white border border-gray-200/80 flex items-center gap-1.5 shadow-2xs">
            <Clock className="h-3 w-3 text-blue-500" />
            <span className="font-semibold text-gray-800">
              {nodeRun.durationMs ? `${nodeRun.durationMs}ms` : '-'}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-white border border-gray-200/80 flex items-center gap-1.5 shadow-2xs">
            <Coins className="h-3 w-3 text-amber-500" />
            <span className="font-semibold text-emerald-700">
              ₹{(nodeRun.cost ?? 0).toFixed(3)}
            </span>
          </div>

          {nodeRun.retryCount !== undefined && nodeRun.retryCount > 0 && (
            <div className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-1.5 text-amber-800 shadow-2xs">
              <RotateCcw className="h-3 w-3" />
              <span>{nodeRun.retryCount} Retries</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 px-4 bg-white gap-1 pt-1">
        <button
          onClick={() => setActiveTab('output')}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'output'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Output Snapshot
        </button>

        <button
          onClick={() => setActiveTab('input')}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'input'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ArrowDownRight className="h-3.5 w-3.5" />
          Input Snapshot
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'metrics'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          Telemetry & Tokens
        </button>

        {isFailed && (
          <button
            onClick={() => setActiveTab('error')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'error'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-rose-500 hover:text-rose-700'
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Error Diagnostics
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div className="p-4 flex-1 overflow-y-auto max-h-[460px] space-y-4">
        {/* TAB 1: OUTPUT SNAPSHOT */}
        {activeTab === 'output' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Processed Node Output
              </span>
              <button
                onClick={() => copyToClipboard(JSON.stringify(nodeRun.output || {}, null, 2), 'output')}
                className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-900 px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                {copied === 'output' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copied === 'output' ? 'Copied' : 'Copy JSON'}
              </button>
            </div>

            {/* Audio Player if Audio Output */}
            {audioR2Key && (
              <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-200/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-900">
                  <Volume2 className="h-4 w-4 text-orange-600" />
                  Synthesized Audio Stream
                </div>
                <AudioPlayer src={`/api/audio/${audioR2Key}`} className="w-full" />
              </div>
            )}

            {audioBase64 && !audioR2Key && (
              <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-200/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-900">
                  <Volume2 className="h-4 w-4 text-orange-600" />
                  Audio Stream (Base64)
                </div>
                <AudioPlayer src={`data:audio/wav;base64,${audioBase64}`} className="w-full" />
              </div>
            )}

            {/* Formatted Text Preview if String/Response */}
            {nodeRun.output && (typeof nodeRun.output === 'string' || nodeRun.output.text || nodeRun.output.translated_text || nodeRun.output.transcript || nodeRun.output.response) && (
              <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 text-xs text-gray-800 leading-relaxed">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                  Decoded String Payload
                </span>
                <p className="whitespace-pre-wrap font-sans">
                  {typeof nodeRun.output === 'string' 
                    ? nodeRun.output 
                    : nodeRun.output.text || nodeRun.output.translated_text || nodeRun.output.transcript || nodeRun.output.response}
                </p>
              </div>
            )}

            {/* Raw JSON Tree */}
            <pre className="p-3 rounded-xl bg-gray-900 text-gray-100 font-mono text-[11px] leading-relaxed overflow-x-auto">
              {JSON.stringify(nodeRun.output || {}, null, 2)}
            </pre>
          </div>
        )}

        {/* TAB 2: INPUT SNAPSHOT */}
        {activeTab === 'input' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Inbound Payload / Upstream Props
              </span>
              <button
                onClick={() => copyToClipboard(JSON.stringify(nodeRun.input || {}, null, 2), 'input')}
                className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-900 px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                {copied === 'input' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copied === 'input' ? 'Copied' : 'Copy JSON'}
              </button>
            </div>

            {inputAudio && (
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                  <Volume2 className="h-4 w-4 text-blue-600" />
                  Inbound Voice / Audio File
                </div>
                <AudioPlayer src={inputAudio.startsWith('data:') ? inputAudio : `/api/audio/${inputAudio}`} className="w-full" />
              </div>
            )}

            <pre className="p-3 rounded-xl bg-gray-900 text-gray-100 font-mono text-[11px] leading-relaxed overflow-x-auto">
              {JSON.stringify(nodeRun.input || {}, null, 2)}
            </pre>
          </div>
        )}

        {/* TAB 3: METRICS & TOKENS */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80">
                <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                  Span Latency
                </span>
                <span className="text-base font-bold font-mono text-gray-900 mt-1 block">
                  {nodeRun.durationMs ?? 0} ms
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80">
                <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                  Node Cost
                </span>
                <span className="text-base font-bold font-mono text-emerald-700 mt-1 block">
                  ₹{(nodeRun.cost ?? 0).toFixed(4)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80">
                <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                  Retry Count
                </span>
                <span className="text-base font-bold font-mono text-gray-900 mt-1 block">
                  {nodeRun.retryCount ?? 0}
                </span>
              </div>
            </div>

            {/* Token & Character Usage Metrics */}
            <div className="rounded-xl border border-gray-200/80 bg-white p-3.5 space-y-2">
              <h5 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-blue-600" /> Token & Capacity Breakdown
              </h5>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {nodeRun.tokenUsage?.promptTokens !== undefined && (
                  <div className="flex justify-between p-2 rounded bg-gray-50">
                    <span className="text-gray-500">Prompt Tokens:</span>
                    <span className="font-semibold text-gray-900">{nodeRun.tokenUsage.promptTokens}</span>
                  </div>
                )}
                {nodeRun.tokenUsage?.completionTokens !== undefined && (
                  <div className="flex justify-between p-2 rounded bg-gray-50">
                    <span className="text-gray-500">Completion Tokens:</span>
                    <span className="font-semibold text-gray-900">{nodeRun.tokenUsage.completionTokens}</span>
                  </div>
                )}
                {nodeRun.tokenUsage?.totalTokens !== undefined && (
                  <div className="flex justify-between p-2 rounded bg-blue-50/60 text-blue-900">
                    <span className="font-semibold">Total Tokens:</span>
                    <span className="font-bold">{nodeRun.tokenUsage.totalTokens}</span>
                  </div>
                )}
                {nodeRun.tokenUsage?.charCount !== undefined && (
                  <div className="flex justify-between p-2 rounded bg-gray-50">
                    <span className="text-gray-500">Characters Processed:</span>
                    <span className="font-semibold text-gray-900">{nodeRun.tokenUsage.charCount}</span>
                  </div>
                )}
                {nodeRun.tokenUsage?.audioDurationSec !== undefined && (
                  <div className="flex justify-between p-2 rounded bg-gray-50">
                    <span className="text-gray-500">Audio Duration:</span>
                    <span className="font-semibold text-gray-900">{nodeRun.tokenUsage.audioDurationSec}s</span>
                  </div>
                )}
                {nodeRun.tokenUsage?.segments !== undefined && (
                  <div className="flex justify-between p-2 rounded bg-gray-50">
                    <span className="text-gray-500">STT Segments (30s):</span>
                    <span className="font-semibold text-gray-900">{nodeRun.tokenUsage.segments}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="text-[11px] text-gray-400 space-y-1 font-mono pt-1">
              <div>Started: {nodeRun.startedAt ? new Date(nodeRun.startedAt).toISOString() : '-'}</div>
              <div>Finished: {nodeRun.finishedAt ? new Date(nodeRun.finishedAt).toISOString() : '-'}</div>
            </div>
          </div>
        )}

        {/* TAB 4: ERROR DIAGNOSTICS */}
        {activeTab === 'error' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                <h5 className="text-xs font-bold">Node Execution Failure</h5>
              </div>
              <p className="text-xs font-mono bg-white/80 p-2.5 rounded-lg border border-rose-200/60 break-words">
                {nodeRun.error || 'Unknown runtime exception'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
