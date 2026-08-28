'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { RegressionView } from '@/components/regression/RegressionView';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, ArrowRightLeft, Workflow, History } from 'lucide-react';

export default function PipelineRegressionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: pipelineId } = use(params);

  return (
    <div className="min-h-screen bg-gray-50/40 flex flex-col font-sans relative overflow-hidden">
      {/* Background glow highlights */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-blue-100/30 rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-purple-100/20 rounded-full blur-3xl opacity-60 pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative z-10">
        {/* Navigation Breadcrumbs */}
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
            <span className="text-gray-900 font-bold">Regression Analysis</span>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/pipeline/${pipelineId}/history`}>
              <Button variant="ghost" size="sm" icon={<History className="h-3.5 w-3.5" />}>
                Execution History
              </Button>
            </Link>
            <Link href={`/pipeline/${pipelineId}`}>
              <Button variant="primary" size="sm" icon={<Workflow className="h-3.5 w-3.5" />}>
                Open Editor
              </Button>
            </Link>
          </div>
        </div>

        {/* Page Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50 border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
                A/B Testing & Comparison
              </span>
              <span className="text-xs text-gray-400 font-mono">
                Regression Engine
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              Pipeline Regression View (v1 vs v2)
            </h1>
            <p className="text-xs text-gray-500">
              Run side-by-side verification comparisons between pipeline versions over identical test sets. Categorize regressions, improvements, and visualize text diff outputs.
            </p>
          </div>
        </div>

        {/* Regression Comparison Workspace */}
        <RegressionView pipelineId={pipelineId} />
      </main>
    </div>
  );
}
