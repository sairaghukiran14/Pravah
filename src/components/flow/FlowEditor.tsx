'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  ReactFlow, Controls, Background, MiniMap, BackgroundVariant, useReactFlow, ReactFlowProvider,
} from '@xyflow/react';
import { usePipelineStore } from '@/store/pipelineStore';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NODE_DESCRIPTIONS } from '@/lib/nodeHelp';
import { STTNode } from './nodes/STTNode';
import { TranslateNode } from './nodes/TranslateNode';
import { TTSNode } from './nodes/TTSNode';
import { GenericNode } from './nodes/GenericNode';
import { DeletableEdge } from './nodes/DeletableEdge';
import { NodeType } from '@/types/pipeline';

const nodeTypes = { 
  stt: STTNode, 
  translate: TranslateNode, 
  tts: TTSNode,
  audio_input: GenericNode,
  text_input: GenericNode,
  document_input: GenericNode,
  image_input: GenericNode,
  video_input: GenericNode,
  url_input: GenericNode,
  ocr: GenericNode,
  llm: GenericNode,
  summarize: GenericNode,
  sentiment: GenericNode,
  keyword_extraction: GenericNode,
  classification: GenericNode,
  text_output: GenericNode,
  audio_output: GenericNode,
  file_output: GenericNode,
  podcast: GenericNode,
  router: GenericNode,
  delay: GenericNode,
  pdf_splitter: GenericNode,
  vector_search: GenericNode,
  transliteration: GenericNode,
  language_detect: GenericNode,
  codemix_normalizer: GenericNode,
  webhook: GenericNode,
  sms_sender: GenericNode,
};

const edgeTypes = {
  deletable: DeletableEdge,
};

const FlowEditorContent: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const onNodesChange = usePipelineStore((s) => s.onNodesChange);
  const onEdgesChange = usePipelineStore((s) => s.onEdgesChange);
  const onConnect = usePipelineStore((s) => s.onConnect);
  const addNode = usePipelineStore((s) => s.addNode);
  const selectNode = usePipelineStore((s) => s.selectNode);
  const setHoveredNodeType = usePipelineStore((s) => s.setHoveredNodeType);
  const edgeToDeleteId = usePipelineStore((s) => s.edgeToDeleteId);
  const setEdgeToDeleteId = usePipelineStore((s) => s.setEdgeToDeleteId);
  const removeEdge = usePipelineStore((s) => s.removeEdge);

  const [hoveredNode, setHoveredNode] = useState<{ id: string; type: string; label: string; x: number; y: number } | null>(null);

  const onNodeMouseEnter = useCallback((event: React.MouseEvent, node: any) => {
    setHoveredNode({
      id: node.id,
      type: node.type,
      label: node.data.label || node.id,
      x: event.clientX,
      y: event.clientY,
    });
    setHoveredNodeType(node.type);
  }, [setHoveredNodeType]);

  const onNodeMouseMove = useCallback((event: React.MouseEvent, node: any) => {
    setHoveredNode((prev) => prev ? {
      ...prev,
      x: event.clientX,
      y: event.clientY,
    } : null);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
    setHoveredNodeType(null);
  }, [setHoveredNodeType]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
  );

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full min-h-[400px] relative" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={() => selectNode(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        zoomOnPinch={true}
        panOnDrag={true}
        preventScrolling={true}
        defaultEdgeOptions={{ type: 'deletable', animated: true, style: { stroke: '#d1d5db', strokeWidth: 2 } }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
        <Controls position="bottom-right" />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'stt') return '#34d399';
            if (node.type === 'translate') return '#60a5fa';
            if (node.type === 'tts') return '#fb923c';
            if (node.type === 'podcast') return '#f43f5e';
            if (node.type === 'router') return '#a855f7';
            if (node.type === 'delay') return '#6366f1';
            if (node.type === 'pdf_splitter' || node.type === 'vector_search') return '#22d3ee';
            if (node.type === 'transliteration' || node.type === 'codemix_normalizer' || node.type === 'language_detect') return '#059669';
            if (node.type === 'webhook' || node.type === 'sms_sender') return '#db2777';
            return '#d1d5db';
          }}
          maskColor="rgba(255, 255, 255, 0.7)"
          position="bottom-left"
          className="hidden sm:block"
        />
      </ReactFlow>

      {edgeToDeleteId && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Connection"
          message="Are you sure you want to delete this connection? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => {
            removeEdge(edgeToDeleteId);
            setEdgeToDeleteId(null);
          }}
          onCancel={() => setEdgeToDeleteId(null)}
        />
      )}

      {hoveredNode && NODE_DESCRIPTIONS[hoveredNode.type as NodeType] && (
        <div 
          className="fixed z-50 pointer-events-none px-3 py-2 bg-slate-900/95 backdrop-blur-[2px] text-white rounded-lg text-[11px] shadow-lg flex flex-col gap-0.5 max-w-xs transition-all duration-75 ease-out border border-slate-800"
          style={{
            left: hoveredNode.x + 15,
            top: hoveredNode.y + 15,
          }}
        >
          <span className="font-semibold text-slate-100">
            {NODE_DESCRIPTIONS[hoveredNode.type as NodeType].title}
          </span>
          <span className="text-slate-300 leading-normal">
            {NODE_DESCRIPTIONS[hoveredNode.type as NodeType].desc}
          </span>
        </div>
      )}
    </div>
  );
};

export const FlowEditor: React.FC = () => (
  <ReactFlowProvider>
    <FlowEditorContent />
  </ReactFlowProvider>
);
