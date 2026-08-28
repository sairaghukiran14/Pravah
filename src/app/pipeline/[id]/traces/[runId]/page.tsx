'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { TraceViewer } from '@/components/traces/TraceViewer';
import { PipelineRunData } from '@/types/pipeline';
import { Button } from '@/components/ui/Button';
import { 
  ArrowLeft, Activity, Workflow, History, RefreshCw, AlertCircle, 
  ExternalLink, Layers
} from 'lucide-react';

export default function PipelineTracePage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id: pipelineId, runId } = use(params);

  const [run, setRun] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrace = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/runs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setRun(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'Failed to fetch trace telemetry');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching trace');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrace();
  }, [pipelineId, runId]);

  return (
    <div className="min-h-screen bg-gray-50/40 flex flex-col font-sans relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-blue-100/30 rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-purple-100/20 rounded-full blur-3xl opacity-60 pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative z-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <Link
              href={`/pipeline/${pipelineId}`}
              className="hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              <Workflow className="h-3.5 w-3.5" /> Editor
            </Link>
            <span>/</span>
            <Link
              href={`/pipeline/${pipelineId}/history`}
              className="hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              <History className="h-3.5 w-3.5" /> History
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-bold font-mono">
              Trace: {runId.slice(-8)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/pipeline/${pipelineId}/history`}>
              <Button variant="ghost" size="sm" icon={<History className="h-3.5 w-3.5" />}>
                All Runs
              </Button>
            </Link>
            <Link href={`/pipeline/${pipelineId}`}>
              <Button variant="primary" size="sm" icon={<Workflow className="h-3.5 w-3.5" />}>
                Open Canvas
              </Button>
            </Link>
          </div>
        </div>

        {/* Page Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50 border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
                Telemetry & Span Trace
              </span>
              <span className="text-xs text-gray-400 font-mono">
                PostgreSQL Span Log
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Pipeline Execution Trace
            </h1>
            <p className="text-xs text-gray-500">
              Per-node execution latency waterfall, token capacity breakdown, input/output snapshots, and retry logs for Run ID:{' '}
              <span className="font-mono font-medium text-gray-800">{runId}</span>
            </p>
          </div>

          {run?.pipeline?.name && (
            <div className="px-3.5 py-2 rounded-xl bg-white/80 border border-gray-200 text-xs text-gray-600 font-medium">
              Pipeline: <span className="font-bold text-gray-900">{run.pipeline.name}</span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && !run && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse border border-gray-200" />
              ))}
            </div>
            <div className="h-64 rounded-2xl bg-gray-100 animate-pulse border border-gray-200" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              Trace Not Available
            </div>
            <p className="text-xs">{error}</p>
            <Button size="sm" onClick={fetchTrace} icon={<RefreshCw className="h-3 w-3" />}>
              Retry
            </Button>
          </div>
        )}

        {/* Trace Content */}
        {run && (
          <TraceViewer
            run={run}
            onRefresh={fetchTrace}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}
