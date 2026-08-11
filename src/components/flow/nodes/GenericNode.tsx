'use client';

import React from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { 
  FileText, Image, Video, Link as LinkIcon, FileUp, 
  Eye, Brain, AlignLeft, Smile, Key, Tags, 
  Monitor, PlayCircle, Download, Mail, FileAudio, Keyboard
} from 'lucide-react';
import { NodeType } from '@/types/pipeline';

const getNodeMeta = (type: NodeType) => {
  switch (type) {
    case 'audio_input': return { icon: <FileAudio className="h-4 w-4 text-pink-600" />, bg: 'bg-pink-50' };
    case 'text_input': return { icon: <Keyboard className="h-4 w-4 text-pink-600" />, bg: 'bg-pink-50' };
    case 'document_input': return { icon: <FileText className="h-4 w-4 text-pink-600" />, bg: 'bg-pink-50' };
    case 'image_input': return { icon: <Image className="h-4 w-4 text-pink-600" />, bg: 'bg-pink-50' };
    case 'video_input': return { icon: <Video className="h-4 w-4 text-pink-600" />, bg: 'bg-pink-50' };
    case 'url_input': return { icon: <LinkIcon className="h-4 w-4 text-pink-600" />, bg: 'bg-pink-50' };

    case 'ocr': return { icon: <ScanText className="h-4 w-4 text-purple-600" />, bg: 'bg-purple-50' };
    case 'vision': return { icon: <Eye className="h-4 w-4 text-purple-600" />, bg: 'bg-purple-50' };
    case 'llm': return { icon: <Brain className="h-4 w-4 text-purple-600" />, bg: 'bg-purple-50' };
    case 'summarize': return { icon: <AlignLeft className="h-4 w-4 text-purple-600" />, bg: 'bg-purple-50' };
    case 'sentiment': return { icon: <Smile className="h-4 w-4 text-purple-600" />, bg: 'bg-purple-50' };
    case 'keyword_extraction': return { icon: <Key className="h-4 w-4 text-purple-600" />, bg: 'bg-purple-50' };
    case 'classification': return { icon: <Tags className="h-4 w-4 text-purple-600" />, bg: 'bg-purple-50' };

    case 'text_output': return { icon: <Monitor className="h-4 w-4 text-indigo-600" />, bg: 'bg-indigo-50' };
    case 'audio_output': return { icon: <PlayCircle className="h-4 w-4 text-indigo-600" />, bg: 'bg-indigo-50' };
    case 'file_output': return { icon: <Download className="h-4 w-4 text-indigo-600" />, bg: 'bg-indigo-50' };

    default: return { icon: <Monitor className="h-4 w-4 text-gray-600" />, bg: 'bg-gray-50' };
  }
};

const ScanText = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8h8"/><path d="M7 12h10"/><path d="M7 16h6"/>
  </svg>
);

export const GenericNode: React.FC<NodeProps> = ({ id, data }) => {
  const config = (data.config as any) || {};
  const meta = getNodeMeta(data.type as NodeType);
  
  // Render generic config entries (max 3 items)
  const renderConfig = () => {
    const keys = Object.keys(config).slice(0, 3);
    if (keys.length === 0) return null;

    const renderValue = (val: any) => {
      if (val && typeof val === 'object') {
        if (val.name) return val.name;
        
        const getCleanName = (pathOrUrl: string) => {
          if (!pathOrUrl) return '';
          const str = String(pathOrUrl);
          if (str.includes('key=')) {
            return str.substring(str.indexOf('key=') + 4);
          }
          if (str.startsWith('http://') || str.startsWith('https://')) {
            return str.substring(str.lastIndexOf('/') + 1);
          }
          return str;
        };

        if (val.r2_key) return getCleanName(val.r2_key);
        if (val.url) return getCleanName(val.url);
        if (val.type === 'audio') return 'Mic Recording';
        return val.type || 'Object';
      }
      return String(val);
    };

    return (
      <div className="flex flex-col gap-1">
        {keys.map(k => (
          <div key={k} className="flex justify-between items-center gap-2">
            <span className="text-gray-400 capitalize truncate max-w-[80px]">{k.replace('_', ' ')}:</span>
            <span className="font-medium text-gray-800 text-xs truncate max-w-[100px]" title={renderValue(config[k])}>
              {renderValue(config[k]) || 'None'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const nodeType = String(data.type || '');
  const isInput = nodeType.endsWith('_input');
  const isOutput = nodeType.endsWith('_output');

  return (
    <BaseNode 
      id={id} 
      typeLabel={String(data.label) || 'Node'} 
      icon={meta.icon} 
      iconBgClass={meta.bg}
      showInputHandle={!isInput}
      showOutputHandle={!isOutput}
    >
      {renderConfig()}
    </BaseNode>
  );
};
