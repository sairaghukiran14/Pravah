'use client';

import React, { useState, useMemo } from 'react';
import { PipelineRunData, NodeRunData } from '@/types/pipeline';
import { TraceWaterfall } from './TraceWaterfall';
import { SpanInspector } from './SpanInspector';
import { 
  Activity, Clock, Coins, CheckCircle2, XCircle, 
  RotateCcw, Download, Copy, Check, Filter, Search, Layers,
  ArrowLeft, RefreshCw, Terminal, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TraceViewerProps {
  run: PipelineRunData & {
    pipeline?: {
      id: string;
      name: string;
      nodes?: any[];
      edges?: any[];
      project?: { id: string; name: string };
    };
  };
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const TraceViewer: React.FC<TraceViewerProps> = ({ run, onRefresh, isLoading }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    run.nodeRuns?.[0]?.nodeId || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedTrace, setCopiedTrace] = useState(false);

  // Compute Total Latency & Total Cost
  const totalCost = useMemo(() => {
    return run.nodeRuns.reduce((sum, n) => sum + (n.cost || 0), 0);
  }, [run.nodeRuns]);

  const totalDurationMs = useMemo(() => {
    if (!run.startedAt) return 0;
    const start = new Date(run.startedAt).getTime();
    if (run.finishedAt) {
      return new Date(run.finishedAt).getTime() - start;
    }
    return run.nodeRuns.reduce((sum, n) => sum + (n.durationMs || 0), 0);
  }, [run.startedAt, run.finishedAt, run.nodeRuns]);

  const totalRetries = useMemo(() => {
    return run.nodeRuns.reduce((sum, n) => sum + (n.retryCount || 0), 0);
  }, [run.nodeRuns]);

  // Filtered nodes
  const filteredNodeRuns = useMemo(() => {
    return run.nodeRuns.filter((node) => {
      const matchesSearch = 
        node.nodeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.nodeType.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' || node.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [run.nodeRuns, searchQuery, statusFilter]);

  const selectedNodeRun = useMemo(() => {
    return run.nodeRuns.find((n) => n.nodeId === selectedNodeId) || run.nodeRuns[0] || null;
  }, [run.nodeRuns, selectedNodeId]);

  const copyTraceJson = () => {
    navigator.clipboard.writeText(JSON.stringify(run, null, 2));
    setCopiedTrace(true);
    setTimeout(() => setCopiedTrace(false), 2000);
  };

  const isSuccess = run.status === 'completed';
  const isFailed = run.status === 'failed';

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Status Card */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center gap-3.5">
          <div className={`p-2.5 rounded-xl border ${
            isSuccess ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
            isFailed ? 'bg-rose-50 border-rose-200 text-rose-600' :
            'bg-blue-50 border-blue-200 text-blue-600 animate-pulse'
          }`}>
            {isSuccess ? <CheckCircle2 className="h-5 w-5" /> :
             isFailed ? <XCircle className="h-5 w-5" /> :
             <Clock className="h-5 w-5" />}
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Run Status
            </span>
            <span className="text-sm font-bold text-gray-900 capitalize mt-0.5 block">
              {run.status}
            </span>
          </div>
        </div>

        {/* End-to-End Latency */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Total Duration
            </span>
            <span className="text-sm font-bold font-mono text-gray-900 mt-0.5 block">
              {totalDurationMs} ms
            </span>
          </div>
        </div>

        {/* Cost Attribution */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Total Billed Cost
            </span>
            <span className="text-sm font-bold font-mono text-emerald-700 mt-0.5 block">
              ₹{totalCost.toFixed(3)}
            </span>
          </div>
        </div>

        {/* Node Spans & Retries */}
        <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-600">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Spans & Retries
            </span>
            <span className="text-sm font-bold text-gray-900 mt-0.5 block">
              {run.nodeRuns.length} Nodes {totalRetries > 0 && `(${totalRetries} retries)`}
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search span by node ID or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1">
            {['all', 'completed', 'failed', 'skipped'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                  statusFilter === status
                    ? 'bg-gray-900 text-white shadow-2xs'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              isLoading={isLoading}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={copyTraceJson}
            icon={copiedTrace ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
          >
            {copiedTrace ? 'Copied Trace' : 'Export JSON'}
          </Button>
        </div>
      </div>

      {/* Main Dual-Panel View: Waterfall + Span Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Waterfall Gantt Chart */}
        <div className="lg:col-span-7 space-y-4">
          <TraceWaterfall
            nodeRuns={filteredNodeRuns}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            runStartedAt={run.startedAt}
            runFinishedAt={run.finishedAt}
          />
        </div>

        {/* Right: Span Deep Inspector */}
        <div className="lg:col-span-5 space-y-4">
          <SpanInspector
            nodeRun={selectedNodeRun}
            allNodes={run.pipeline?.nodes}
          />
        </div>
      </div>
    </div>
  );
};
