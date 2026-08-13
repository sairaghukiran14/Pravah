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
