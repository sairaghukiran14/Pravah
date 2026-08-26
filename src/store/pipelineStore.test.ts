import { describe, it, expect } from 'vitest';
import { isPersistedChange, getDefaultLabel } from './pipelineStore';
import type { NodeType } from '@/types/pipeline';

/**
 * Every node type the engine can execute. Kept here rather than derived, so
 * adding a type to the union without naming it fails loudly instead of
 * shipping a node the canvas calls "Node".
 */
const ALL_NODE_TYPES: NodeType[] = [
  'stt', 'translate', 'tts', 'podcast', 'router', 'delay',
  'pdf_splitter', 'vector_search', 'transliteration', 'codemix_normalizer',
  'webhook', 'sms_sender', 'language_detect',
  'audio_input', 'text_input', 'document_input', 'image_input', 'video_input', 'url_input',
  'ocr', 'vision', 'llm', 'summarize', 'sentiment', 'keyword_extraction', 'classification',
  'text_output', 'audio_output', 'file_output',
];

describe('getDefaultLabel', () => {
  // Nine node types were reaching the fallback, so a dropped Router, Webhook or
  // Document Chunker all appeared on the canvas as "Node".
  it.each(ALL_NODE_TYPES)('names %s rather than falling back', (type) => {
    expect(getDefaultLabel(type)).not.toBe('Node');
  });

  it('names the nodes added for Indic text handling', () => {
    expect(getDefaultLabel('language_detect')).toBe('Detect Language');
    expect(getDefaultLabel('transliteration')).toBe('Transliterate');
  });
});

/**
 * Guards both directions of the unsaved indicator: it must not light up for
 * React Flow's own bookkeeping, and it must still light up for a real edit.
 * Getting the first wrong trains users to ignore it; getting the second wrong
 * loses their work.
 */
describe('isPersistedChange', () => {
  it.each(['dimensions', 'select'])(
    'does not treat a %s change as an edit',
    (type) => {
      expect(isPersistedChange({ type })).toBe(false);
    }
  );

  it.each(['position', 'add', 'remove', 'replace'])(
    'treats a %s change as an edit',
    (type) => {
      expect(isPersistedChange({ type })).toBe(true);
    }
  );

  it('errs towards marking unknown change types as edits', () => {
    expect(isPersistedChange({ type: 'something-new' })).toBe(true);
    expect(isPersistedChange({})).toBe(true);
  });

  // What actually happens on mount: React Flow measures every node, then the
  // user clicks one. Neither should make the pipeline look modified.
  it('stays clean across a mount-and-click sequence', () => {
    const mountChanges = [
      { type: 'dimensions' },
      { type: 'dimensions' },
      { type: 'dimensions' },
      { type: 'select' },
    ];
    expect(mountChanges.some(isPersistedChange)).toBe(false);
  });

  it('becomes dirty as soon as a node is dragged', () => {
    expect([{ type: 'select' }, { type: 'position' }].some(isPersistedChange)).toBe(true);
  });
});

describe('usePipelineStore history & clipboard actions', () => {
  it('handles undo and redo for adding and removing nodes', async () => {
    const { usePipelineStore } = await import('./pipelineStore');
    
    // Reset store state
    usePipelineStore.setState({
      nodes: [],
      edges: [],
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      selectedNodeId: null,
    });

    expect(usePipelineStore.getState().canUndo).toBe(false);
    expect(usePipelineStore.getState().canRedo).toBe(false);

    // 1. Add STT Node
    usePipelineStore.getState().addNode('stt', { x: 100, y: 100 });
    expect(usePipelineStore.getState().nodes.length).toBe(1);
    expect(usePipelineStore.getState().canUndo).toBe(true);
    expect(usePipelineStore.getState().canRedo).toBe(false);

    const firstNodeId = usePipelineStore.getState().nodes[0].id;

    // 2. Add Translate Node
    usePipelineStore.getState().addNode('translate', { x: 300, y: 100 });
    expect(usePipelineStore.getState().nodes.length).toBe(2);

    // 3. Undo adding Translate
    usePipelineStore.getState().undo();
    expect(usePipelineStore.getState().nodes.length).toBe(1);
    expect(usePipelineStore.getState().nodes[0].id).toBe(firstNodeId);
    expect(usePipelineStore.getState().canUndo).toBe(true);
    expect(usePipelineStore.getState().canRedo).toBe(true);

    // 4. Redo adding Translate
    usePipelineStore.getState().redo();
    expect(usePipelineStore.getState().nodes.length).toBe(2);
    expect(usePipelineStore.getState().canRedo).toBe(false);

    // 5. Remove first node
    usePipelineStore.getState().removeNode(firstNodeId);
    expect(usePipelineStore.getState().nodes.length).toBe(1);

    // 6. Undo node removal
    usePipelineStore.getState().undo();
    expect(usePipelineStore.getState().nodes.length).toBe(2);
    expect(usePipelineStore.getState().nodes.some((n) => n.id === firstNodeId)).toBe(true);
  });

  it('duplicates a selected node with offset position and cloned config', async () => {
    const { usePipelineStore } = await import('./pipelineStore');
    
    usePipelineStore.setState({
      nodes: [],
      edges: [],
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      selectedNodeId: null,
    });

    usePipelineStore.getState().addNode('tts', { x: 150, y: 200 });
    const originalNode = usePipelineStore.getState().nodes[0];

    // Update config on original
    usePipelineStore.getState().updateNodeConfig(originalNode.id, { speaker: 'ritu', pace: 1.25 });

    // Select and duplicate
    usePipelineStore.getState().selectNode(originalNode.id);
    const duplicatedId = usePipelineStore.getState().duplicateNode();

    expect(duplicatedId).toBeTruthy();
    expect(usePipelineStore.getState().nodes.length).toBe(2);

    const dupNode = usePipelineStore.getState().nodes.find((n) => n.id === duplicatedId);
    expect(dupNode).toBeDefined();
    expect(dupNode?.position.x).toBe(190);
    expect(dupNode?.position.y).toBe(240);
    expect((dupNode?.data.config as any).speaker).toBe('ritu');
    expect((dupNode?.data.config as any).pace).toBe(1.25);
    expect(usePipelineStore.getState().selectedNodeId).toBe(duplicatedId);
  });

  it('copies and pastes a node via clipboard actions', async () => {
    const { usePipelineStore } = await import('./pipelineStore');
    
    usePipelineStore.setState({
      nodes: [],
      edges: [],
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      selectedNodeId: null,
      clipboardNode: null,
    });

    usePipelineStore.getState().addNode('llm', { x: 50, y: 50 });
    const node = usePipelineStore.getState().nodes[0];
    usePipelineStore.getState().updateNodeConfig(node.id, { prompt: 'Custom prompt for test' });

    // Copy
    usePipelineStore.getState().copyNode(node.id);
    expect(usePipelineStore.getState().clipboardNode).toBeDefined();
    expect(usePipelineStore.getState().clipboardNode?.type).toBe('llm');
    expect(usePipelineStore.getState().clipboardNode?.config.prompt).toBe('Custom prompt for test');

    // Paste
    const pastedId = usePipelineStore.getState().pasteNode({ x: 400, y: 300 });
    expect(pastedId).toBeTruthy();
    expect(usePipelineStore.getState().nodes.length).toBe(2);

    const pastedNode = usePipelineStore.getState().nodes.find((n) => n.id === pastedId);
    expect(pastedNode?.position).toEqual({ x: 400, y: 300 });
    expect((pastedNode?.data.config as any).prompt).toBe('Custom prompt for test');
  });

  it('caps history stack to a maximum of 30 snapshots', async () => {
    const { usePipelineStore } = await import('./pipelineStore');
    
    usePipelineStore.setState({
      nodes: [],
      edges: [],
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });

    // Add 35 nodes sequentially
    for (let i = 0; i < 35; i++) {
      usePipelineStore.getState().addNode('text_input', { x: i * 10, y: i * 10 });
    }

    expect(usePipelineStore.getState().past.length).toBe(30);
  });

  it('toggles command palette open state', async () => {
    const { usePipelineStore } = await import('./pipelineStore');

    usePipelineStore.getState().setCommandPaletteOpen(true);
    expect(usePipelineStore.getState().isCommandPaletteOpen).toBe(true);

    usePipelineStore.getState().setCommandPaletteOpen(false);
    expect(usePipelineStore.getState().isCommandPaletteOpen).toBe(false);
  });

  it('clears canvas and preserves undo history', async () => {
    const { usePipelineStore } = await import('./pipelineStore');

    usePipelineStore.setState({
      nodes: [{ id: 'n1', type: 'stt', position: { x: 0, y: 0 }, data: {} }],
      edges: [],
      past: [],
      future: [],
    });

    usePipelineStore.getState().clearCanvas();
    expect(usePipelineStore.getState().nodes.length).toBe(0);
    expect(usePipelineStore.getState().canUndo).toBe(true);

    usePipelineStore.getState().undo();
    expect(usePipelineStore.getState().nodes.length).toBe(1);
  });

  it('loads pre-built template graph and sets state', async () => {
    const { usePipelineStore } = await import('./pipelineStore');
    const { PIPELINE_TEMPLATES } = await import('@/lib/templates');

    usePipelineStore.setState({
      nodes: [],
      edges: [],
      past: [],
    });

    usePipelineStore.getState().loadTemplateGraph(PIPELINE_TEMPLATES[0]);
    expect(usePipelineStore.getState().nodes.length).toBe(PIPELINE_TEMPLATES[0].nodes.length);
    expect(usePipelineStore.getState().edges.length).toBe(PIPELINE_TEMPLATES[0].edges.length);
    expect(usePipelineStore.getState().canUndo).toBe(true);
  });

  it('imports pipeline JSON data and marks dirty', async () => {
    const { usePipelineStore } = await import('./pipelineStore');

    usePipelineStore.getState().importPipelineData({
      name: 'Imported Workflow',
      nodes: [{ id: 'imp-1', type: 'translate', position: { x: 50, y: 50 }, data: {} }],
      edges: [],
    });

    expect(usePipelineStore.getState().pipelineName).toBe('Imported Workflow');
    expect(usePipelineStore.getState().nodes.length).toBe(1);
    expect(usePipelineStore.getState().isDirty).toBe(true);
  });
});


