'use client';

import React from 'react';
import { NodeRunData } from '@/types/pipeline';
import { Badge } from '@/components/ui/Badge';
import { Mic, Languages, Volume2, Clock } from 'lucide-react';
import { AudioPlayer } from '@/components/ui/AudioPlayer';

interface NodeRunDetailsProps {
  nodeRun: NodeRunData;
}

export const NodeRunDetails: React.FC<NodeRunDetailsProps> = ({ nodeRun }) => {
  const formatTime = (iso?: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString();
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {nodeRun.nodeType === 'stt' && <div className="p-1 rounded bg-emerald-50"><Mic className="h-3.5 w-3.5 text-emerald-600" /></div>}
          {nodeRun.nodeType === 'translate' && <div className="p-1 rounded bg-blue-50"><Languages className="h-3.5 w-3.5 text-blue-600" /></div>}
          {nodeRun.nodeType === 'tts' && <div className="p-1 rounded bg-orange-50"><Volume2 className="h-3.5 w-3.5 text-orange-600" /></div>}
          <span className="text-xs font-semibold text-gray-900">
            Node: {nodeRun.nodeId} ({nodeRun.nodeType})
          </span>
        </div>
        <Badge status={nodeRun.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Input Payload */}
        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block mb-1">
            Node Input
          </span>
          <pre className="text-gray-700 font-mono text-[11px] whitespace-pre-wrap">
            {JSON.stringify(nodeRun.input || {}, null, 2)}
          </pre>
        </div>

        {/* Output Payload */}
        <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 flex flex-col gap-2">
          <div>
            <span className="text-[10px] text-emerald-700 uppercase tracking-wider font-semibold block mb-1">
              Node Output / Response
            </span>
            <pre className="text-emerald-800 font-mono text-[11px] whitespace-pre-wrap max-h-32 overflow-y-auto">
              {JSON.stringify(nodeRun.output || nodeRun.error || {}, null, 2)}
            </pre>
          </div>
          {nodeRun.output && (nodeRun.output as any).audio_r2_key && (
            <AudioPlayer src={`/api/audio/${(nodeRun.output as any).audio_r2_key}`} className="mt-1" />
          )}
          {nodeRun.output && (nodeRun.output as any).audios && (nodeRun.output as any).audios[0] && (
            <AudioPlayer src={`data:audio/wav;base64,${(nodeRun.output as any).audios[0]}`} className="mt-1" />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Started: {formatTime(nodeRun.startedAt)}</span>
        </div>
        <span>Finished: {formatTime(nodeRun.finishedAt)}</span>
      </div>
    </div>
  );
};
