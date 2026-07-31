'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  ReactFlow, Controls, Background, MiniMap, BackgroundVariant, useReactFlow, ReactFlowProvider,
} from '@xyflow/react';
import { usePipelineStore } from '@/store/pipelineStore';
import { NODE_DESCRIPTIONS } from '@/lib/nodeHelp';
import { STTNode } from './nodes/STTNode';
import { TranslateNode } from './nodes/TranslateNode';
import { TTSNode } from './nodes/TTSNode';
import { GenericNode } from './nodes/GenericNode';
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
  vision: GenericNode,
  llm: GenericNode,
  summarize: GenericNode,
  sentiment: GenericNode,
  keyword_extraction: GenericNode,
  classification: GenericNode,
  text_output: GenericNode,
  audio_output: GenericNode,
  file_output: GenericNode,
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
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        zoomOnPinch={true}
        panOnDrag={true}
        preventScrolling={true}
        defaultEdgeOptions={{ animated: true, style: { stroke: '#d1d5db', strokeWidth: 2 } }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
        <Controls position="bottom-right" />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'stt') return '#34d399';
            if (node.type === 'translate') return '#60a5fa';
            if (node.type === 'tts') return '#fb923c';
            return '#d1d5db';
          }}
          maskColor="rgba(255, 255, 255, 0.7)"
          position="bottom-left"
          className="hidden sm:block"
        />
      </ReactFlow>
    </div>
  );
};

export const FlowEditor: React.FC = () => (
  <ReactFlowProvider>
    <FlowEditorContent />
  </ReactFlowProvider>
);
