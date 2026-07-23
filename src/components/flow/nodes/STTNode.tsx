'use client';

import React from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Mic } from 'lucide-react';

export const STTNode: React.FC<NodeProps> = ({ id, data }) => {
  const config = (data.config as any) || {};

  return (
    <BaseNode id={id} typeLabel="Speech to Text" icon={<Mic className="h-4 w-4 text-emerald-600" />} iconBgClass="bg-emerald-50">
      <div className="flex flex-col gap-1">
        <div className="flex justify-between">
          <span className="text-gray-400">Language:</span>
          <span className="font-medium text-gray-800">{config.language_code || 'hi-IN'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Model:</span>
          <span className="font-mono text-gray-600">{config.model || 'saaras:v3'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Mode:</span>
          <span className="capitalize text-gray-600">{config.mode || 'transcribe'}</span>
        </div>
      </div>
    </BaseNode>
  );
};
