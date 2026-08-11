'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { usePipelineStore } from '@/store/pipelineStore';
import { RunStatus } from '@/types/pipeline';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface BaseNodeProps {
  id: string;
  typeLabel: string;
  icon: React.ReactNode;
  iconBgClass: string;
  children: React.ReactNode;
  showInputHandle?: boolean;
  showOutputHandle?: boolean;
}

export const BaseNode: React.FC<BaseNodeProps> = ({ 
  id, 
  typeLabel, 
  icon, 
  iconBgClass, 
  children,
  showInputHandle = true,
  showOutputHandle = true,
}) => {
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId);
  const selectNode = usePipelineStore((s) => s.selectNode);
  const status: RunStatus = usePipelineStore((s) => s.nodeStatuses[id] || 'pending');
  const output = usePipelineStore((s) => s.nodeOutputs[id]);
  const isSelected = selectedNodeId === id;

  const updateNodeLabel = usePipelineStore((s) => s.updateNodeLabel);
  const [isEditingLabel, setIsEditingLabel] = React.useState(false);
  const [localLabel, setLocalLabel] = React.useState(typeLabel);

  React.useEffect(() => {
    setLocalLabel(typeLabel);
  }, [typeLabel]);

  let statusAnimationClass = '';
  if (status === 'running') statusAnimationClass = 'node-status-running';
  else if (status === 'completed') statusAnimationClass = 'node-status-completed';
  else if (status === 'failed') statusAnimationClass = 'node-status-failed';
  else if (status === 'skipped') statusAnimationClass = 'node-status-skipped';

  return (
    <div
      onClick={(e) => { e.stopPropagation(); selectNode(id); }}
      className={`relative min-w-[240px] max-w-[280px] rounded-xl border bg-white shadow-sm transition-all cursor-pointer ${
        isSelected
          ? 'border-gray-900 ring-2 ring-gray-900/20 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      } ${statusAnimationClass}`}
    >
      {showInputHandle && (
        <Handle type="target" position={Position.Left} id="input"
          className="!w-3 !h-3 !bg-gray-900 !border-2 !border-white hover:!scale-125 transition-transform" />
      )}
      {showOutputHandle && (
        <Handle type="source" position={Position.Right} id="output"
          className="!w-3 !h-3 !bg-gray-900 !border-2 !border-white hover:!scale-125 transition-transform" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${iconBgClass}`}>{icon}</div>
          {isEditingLabel ? (
            <input 
              autoFocus
              value={localLabel}
              onChange={(e) => setLocalLabel(e.target.value)}
              onBlur={() => { setIsEditingLabel(false); updateNodeLabel(id, localLabel); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { setIsEditingLabel(false); updateNodeLabel(id, localLabel); } }}
              className="text-xs font-semibold text-gray-900 bg-transparent outline-none border-b border-gray-400 w-full max-w-[120px]"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span 
              className="text-xs font-semibold text-gray-900 cursor-text hover:bg-gray-100 px-1 rounded -ml-1 py-0.5 transition-colors" 
              onClick={(e) => { e.stopPropagation(); setIsEditingLabel(true); }}
              title="Click to rename"
            >
              {typeLabel}
            </span>
          )}
        </div>

        {status === 'running' && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-blue-600">
            <Loader2 className="h-3 w-3 animate-spin" /> Running
          </span>
        )}
        {status === 'completed' && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Done
          </span>
        )}
        {status === 'failed' && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-red-600">
            <AlertCircle className="h-3.5 w-3.5" /> Failed
          </span>
        )}
        {status === 'skipped' && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
            <AlertCircle className="h-3.5 w-3.5 text-gray-400" /> Skipped
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3 text-xs space-y-1.5 text-gray-600">{children}</div>


    </div>
  );
};
