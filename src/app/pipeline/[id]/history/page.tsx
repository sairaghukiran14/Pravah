'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { RunsTable } from '@/components/history/RunsTable';
import { PipelineRunData } from '@/types/pipeline';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, RefreshCw, History, Workflow } from 'lucide-react';

export default function ExecutionHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: pipelineId } = use(params);

  const [runs, setRuns] = useState<PipelineRunData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRuns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/runs`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
      }
    } catch (err) {
      console.error('Error fetching execution history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [pipelineId]);

  return (
    <div className="min-h-screen bg-gray-50/40 flex flex-col font-sans relative overflow-hidden">
      {/* Soft background blurs */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-100/30 rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-100/20 rounded-full blur-3xl opacity-60 pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative z-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/pipeline/${pipelineId}`}
            className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Visual Node Editor
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRuns}
            isLoading={isLoading}
            disabled={isLoading}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh Logs
          </Button>
        </div>

        {/* Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-50/40 via-indigo-50/20 to-purple-50/40 border border-gray-200/80 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wider">
                Audit Trail
              </span>
              <span className="text-xs text-gray-400">PostgreSQL History Sync</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <History className="h-5 w-5 text-gray-700" /> Pipeline Execution History
            </h1>
            <p className="text-xs text-gray-500">
              Review past execution logs, node output payloads, and durations for Pipeline ID:{' '}
              <span className="font-mono text-gray-700">{pipelineId}</span>
            </p>
          </div>

          <Link href={`/pipeline/${pipelineId}`}>
            <Button size="md" icon={<Workflow className="h-4 w-4" />}>
              Open Node Editor
            </Button>
          </Link>
        </div>

        {/* History Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-gray-50 animate-pulse border border-gray-200"
              />
            ))}
          </div>
        ) : (
          <RunsTable runs={runs} />
        )}
      </main>
    </div>
  );
}
