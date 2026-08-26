'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
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
import { CommandPalette } from './CommandPalette';
import { TemplatesModal } from './TemplatesModal';
import { ShortcutsModal } from './ShortcutsModal';
import { Sparkles, Plus, Search, Workflow, Play, Mic, HelpCircle } from 'lucide-react';
import { PIPELINE_TEMPLATES } from '@/lib/templates';

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
  const { screenToFlowPosition, fitView } = useReactFlow();

  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const onNodesChange = usePipelineStore((s) => s.onNodesChange);
  const onEdgesChange = usePipelineStore((s) => s.onEdgesChange);
  const onConnect = usePipelineStore((s) => s.onConnect);
  const addNode = usePipelineStore((s) => s.addNode);
  const selectNode = usePipelineStore((s) => s.selectNode);
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId);
  const setHoveredNodeType = usePipelineStore((s) => s.setHoveredNodeType);
  const edgeToDeleteId = usePipelineStore((s) => s.edgeToDeleteId);
  const setEdgeToDeleteId = usePipelineStore((s) => s.setEdgeToDeleteId);
  const removeEdge = usePipelineStore((s) => s.removeEdge);
  const loadTemplateGraph = usePipelineStore((s) => s.loadTemplateGraph);

  const undo = usePipelineStore((s) => s.undo);
  const redo = usePipelineStore((s) => s.redo);
  const duplicateNode = usePipelineStore((s) => s.duplicateNode);
  const copyNode = usePipelineStore((s) => s.copyNode);
  const pasteNode = usePipelineStore((s) => s.pasteNode);
  const isCommandPaletteOpen = usePipelineStore((s) => s.isCommandPaletteOpen);
  const setCommandPaletteOpen = usePipelineStore((s) => s.setCommandPaletteOpen);

  const [hoveredNode, setHoveredNode] = useState<{ id: string; type: string; label: string; x: number; y: number } | null>(null);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Global Keyboard Shortcuts (Undo, Redo, Duplicate, Copy, Paste, Cmd+K, Cmd+0, Shortcuts helper)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isInput) return;

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
        return;
      }

      if (modifier && e.key === '0') {
        e.preventDefault();
        fitView({ duration: 300 });
        return;
      }

      if (e.key === '?' || (modifier && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      if (modifier && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      if (
        (modifier && e.shiftKey && e.key.toLowerCase() === 'z') ||
        (modifier && e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        redo();
        return;
      }

      if (modifier && e.key.toLowerCase() === 'd') {
        if (selectedNodeId) {
          e.preventDefault();
          duplicateNode(selectedNodeId);
        }
        return;
      }

      if (modifier && e.key.toLowerCase() === 'c') {
        if (window.getSelection() && String(window.getSelection()).length > 0) {
          return;
        }
        if (selectedNodeId) {
          e.preventDefault();
          copyNode(selectedNodeId);
        }
        return;
      }

      if (modifier && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteNode();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, duplicateNode, copyNode, pasteNode, selectedNodeId, isCommandPaletteOpen, setCommandPaletteOpen, fitView]);

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

  const handlePaletteSelectNode = useCallback(
    (type: NodeType) => {
      let position = { x: 260, y: 160 };
      if (reactFlowWrapper.current) {
        const rect = reactFlowWrapper.current.getBoundingClientRect();
        position = screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
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

      {/* Empty Canvas Starter Hero */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
          <div className="pointer-events-auto max-w-md w-full bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/80 p-6 shadow-xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-xs">
              <Workflow className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900">Your Canvas is Ready</h3>
              <p className="text-xs text-gray-500 mt-1">
                Drag nodes from the top toolbar, start with a pre-configured template, or press <kbd className="font-mono px-1 py-0.5 bg-gray-100 rounded border text-gray-700">⌘K</kbd>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setIsTemplatesModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Browse Templates
              </button>

              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium transition-all cursor-pointer"
              >
                <Search className="h-3.5 w-3.5 text-gray-500" />
                Add Node (⌘K)
              </button>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                💡 <button onClick={() => loadTemplateGraph(PIPELINE_TEMPLATES[0])} className="text-indigo-600 hover:underline font-medium">Quick load Voice Dubber</button>
              </span>
              <button
                onClick={() => setIsShortcutsModalOpen(true)}
                className="flex items-center gap-1 text-gray-400 hover:text-gray-600"
              >
                <HelpCircle className="h-3 w-3" /> Shortcuts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectNode={handlePaletteSelectNode}
      />

      {/* Templates Modal */}
      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
      />

      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

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
