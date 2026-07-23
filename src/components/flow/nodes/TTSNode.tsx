'use client';

import React from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Volume2 } from 'lucide-react';

export const TTSNode: React.FC<NodeProps> = ({ id, data }) => {
  const config = (data.config as any) || {};

  return (
    <BaseNode id={id} typeLabel="Text to Speech" icon={<Volume2 className="h-4 w-4 text-orange-600" />} iconBgClass="bg-orange-50">
      <div className="flex flex-col gap-1">
        <div className="flex justify-between">
          <span className="text-gray-400">Target Lang:</span>
          <span className="font-medium text-gray-800">{config.target_language_code || 'hi-IN'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Speaker:</span>
          <span className="capitalize text-gray-600">{config.speaker || 'aditya'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Pace:</span>
          <span className="font-mono text-gray-600">{config.pace || 1.0}x</span>
        </div>
      </div>
    </BaseNode>
  );
};
