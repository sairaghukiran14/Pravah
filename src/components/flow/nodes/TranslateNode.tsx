'use client';

import React from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Languages } from 'lucide-react';

export const TranslateNode: React.FC<NodeProps> = ({ id, data }) => {
  const config = (data.config as any) || {};

  return (
    <BaseNode id={id} typeLabel="Translation" icon={<Languages className="h-4 w-4 text-blue-600" />} iconBgClass="bg-blue-50">
      <div className="flex flex-col gap-1">
        <div className="flex justify-between">
          <span className="text-gray-400">Source:</span>
          <span className="font-medium text-gray-800">{config.source_language_code || 'auto'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Target:</span>
          <span className="font-medium text-gray-800">{config.target_language_code || 'hi-IN'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Mode:</span>
          <span className="capitalize text-gray-600">{config.mode || 'formal'}</span>
        </div>
      </div>
    </BaseNode>
  );
};
