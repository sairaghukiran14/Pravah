'use client';

import React, { useState } from 'react';
import { PipelineRunData } from '@/types/pipeline';
import { Badge } from '@/components/ui/Badge';
import { NodeRunDetails } from './NodeRunDetails';
import { ChevronDown, ChevronRight, PlayCircle, Clock } from 'lucide-react';

interface RunsTableProps {
  runs: PipelineRunData[];
}

export const RunsTable: React.FC<RunsTableProps> = ({ runs }) => {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(
    runs.length > 0 ? runs[0].id : null
  );

  const toggleExpand = (id: string) => {
    setExpandedRunId(expandedRunId === id ? null : id);
  };

  const getDuration = (start: string, finish?: string | null) => {
    if (!finish) return 'Running...';
    const ms = new Date(finish).getTime() - new Date(start).getTime();
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <PlayCircle className="mx-auto h-10 w-10 text-gray-300 mb-3" />
        <h3 className="text-sm font-semibold text-gray-900">No Execution History</h3>
        <p className="text-xs text-gray-400 mt-1">
          Run your pipeline from the editor to view execution logs and node outputs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => {
        const isExpanded = expandedRunId === run.id;

        return (
          <div
            key={run.id}
            className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm transition-all"
          >
            {/* Header Row */}
            <div
              onClick={() => toggleExpand(run.id)}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <button className="text-gray-400">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-700" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      Run #{run.id.substring(run.id.length - 8)}
                    </span>
                    <Badge status={run.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                    <span>Started: {new Date(run.startedAt).toLocaleString()}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-gray-600">
                      <Clock className="h-3 w-3" /> {getDuration(run.startedAt, run.finishedAt)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="text-right text-xs text-gray-400 hidden sm:block">
                <span>{run.nodeRuns?.length || 0} Nodes Executed</span>
              </div>
            </div>

            {/* Expanded Node Runs Breakdown */}
            {isExpanded && (
              <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Node Execution Flow & Output Logs
                </h4>
                {run.nodeRuns && run.nodeRuns.length > 0 ? (
                  run.nodeRuns.map((nodeRun) => (
                    <NodeRunDetails key={nodeRun.id} nodeRun={nodeRun} />
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic">No node log details recorded.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
