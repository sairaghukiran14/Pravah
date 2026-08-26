'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { PIPELINE_TEMPLATES, PipelineTemplate } from '@/lib/templates';
import { usePipelineStore } from '@/store/pipelineStore';
import { Sparkles, ArrowRight, Mic, FileText, PlayCircle, Smile, Layers } from 'lucide-react';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getTemplateIcon = (icon: string) => {
  switch (icon) {
    case 'Mic':
      return <Mic className="h-5 w-5 text-emerald-600" />;
    case 'FileText':
      return <FileText className="h-5 w-5 text-blue-600" />;
    case 'PlayCircle':
      return <PlayCircle className="h-5 w-5 text-rose-600" />;
    case 'Smile':
      return <Smile className="h-5 w-5 text-purple-600" />;
    default:
      return <Layers className="h-5 w-5 text-indigo-600" />;
  }
};

export const TemplatesModal: React.FC<TemplatesModalProps> = ({ isOpen, onClose }) => {
  const loadTemplateGraph = usePipelineStore((s) => s.loadTemplateGraph);

  const handleSelectTemplate = (template: PipelineTemplate) => {
    loadTemplateGraph(template);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose a Pipeline Template" size="2xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Jumpstart your multimodal AI workflow with pre-configured, battle-tested DAG templates for Indic languages.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {PIPELINE_TEMPLATES.map((template) => (
            <div
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              className="group relative flex flex-col justify-between p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-indigo-50 transition-colors">
                      {getTemplateIcon(template.icon)}
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
                      {template.name}
                    </h4>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {template.badge}
                  </span>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                  {template.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-medium">
                  {template.nodes.length} connected nodes
                </span>
                <span className="inline-flex items-center text-xs font-medium text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                  Load Workflow <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
