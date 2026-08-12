import { describe, it, expect } from 'vitest';
import { fingerprintTemplate, fingerprintPipeline, withoutUserData, userDataFrom } from './libraryFingerprint';
import type { LibraryPipelineTemplate } from './libraryTemplates';

const template: LibraryPipelineTemplate = {
  name: 'Test Pipeline',
  description: 'x',
  nodes: [
    { type: 'text_input', label: 'In', x: 0, y: 0, config: {} },
    { type: 'translate', label: 'Translate', x: 10, y: 10, config: { target_language_code: 'te-IN' } },
    { type: 'text_output', label: 'Out', x: 20, y: 20, config: {} },
  ],
  edges: [
    { source: 0, target: 1 },
    { source: 1, target: 2 },
  ],
};

/** The database shape a fresh seed of `template` would produce. */
function seeded(overrides: Partial<{ config: any; type: string; label: string }>[] = []) {
  const nodes = template.nodes.map((n, i) => ({
    id: `node_${n.type}_${i}_abc`,
    type: overrides[i]?.type ?? n.type,
    label: overrides[i]?.label ?? n.label,
    config: overrides[i]?.config ?? n.config,
  }));
  const edges = template.edges.map((e) => ({
    source: nodes[e.source].id,
    target: nodes[e.target].id,
  }));
  return { nodes, edges };
}

describe('fingerprint', () => {
  it('matches between a template and a pipeline seeded from it', () => {
    const { nodes, edges } = seeded();
    expect(fingerprintPipeline(nodes, edges)).toBe(fingerprintTemplate(template));
  });

  it('is independent of the generated node ids', () => {
    const a = seeded();
    const b = seeded();
    b.nodes.forEach((n, i) => {
      const old = n.id;
      n.id = `totally_different_${i}`;
      b.edges.forEach((e) => {
        if (e.source === old) e.source = n.id;
        if (e.target === old) e.target = n.id;
      });
    });
    expect(fingerprintPipeline(b.nodes, b.edges)).toBe(fingerprintPipeline(a.nodes, a.edges));
  });

  it('is independent of the order rows come back from the database', () => {
    const a = seeded();
    const b = seeded();
    b.nodes.reverse();
    expect(fingerprintPipeline(b.nodes, b.edges)).toBe(fingerprintPipeline(a.nodes, a.edges));
  });

  it('is independent of key order inside a config', () => {
    const a = seeded([{}, { config: { target_language_code: 'te-IN', mode: 'formal' } }]);
    const b = seeded([{}, { config: { mode: 'formal', target_language_code: 'te-IN' } }]);
    expect(fingerprintPipeline(b.nodes, b.edges)).toBe(fingerprintPipeline(a.nodes, a.edges));
  });

  // An upload is the user's content, not an edit to the workflow — a pipeline
  // carrying one must stay eligible for a template correction.
  it('ignores uploaded files', () => {
    const clean = seeded();
    const withUpload = seeded([
      { config: { file_data: { name: 'resume.pdf', r2_key: 'audio_input_x' } } },
    ]);
    expect(fingerprintPipeline(withUpload.nodes, withUpload.edges)).toBe(
      fingerprintPipeline(clean.nodes, clean.edges)
    );
  });

  it('changes when the user edits a config value', () => {
    const edited = seeded([{}, { config: { target_language_code: 'ta-IN' } }]);
    expect(fingerprintPipeline(edited.nodes, edited.edges)).not.toBe(fingerprintTemplate(template));
  });

  it('changes when a node is added or removed', () => {
    const { nodes, edges } = seeded();
    expect(fingerprintPipeline(nodes.slice(0, 2), edges.slice(0, 1))).not.toBe(
      fingerprintTemplate(template)
    );
  });

  it('changes when the wiring changes but the nodes do not', () => {
    const { nodes } = seeded();
    const rewired = [{ source: nodes[0].id, target: nodes[2].id }];
    expect(fingerprintPipeline(nodes, rewired)).not.toBe(fingerprintTemplate(template));
  });

  it('changes when the shipped template changes', () => {
    const fixed: LibraryPipelineTemplate = {
      ...template,
      nodes: [
        template.nodes[0],
        { type: 'vision', label: 'Digitise', x: 5, y: 5, config: {} },
        ...template.nodes.slice(1),
      ],
      edges: [
        { source: 0, target: 1 },
        { source: 1, target: 2 },
        { source: 2, target: 3 },
      ],
    };
    expect(fingerprintTemplate(fixed)).not.toBe(fingerprintTemplate(template));
  });
});

describe('user data helpers', () => {
  it('separates uploads from template configuration', () => {
    const config = { format: 'pdf', file_data: { name: 'a.pdf' }, r2_key: 'k' };
    expect(withoutUserData(config)).toEqual({ format: 'pdf' });
    expect(userDataFrom(config)).toEqual({ file_data: { name: 'a.pdf' }, r2_key: 'k' });
  });

  it('handles a missing config', () => {
    expect(withoutUserData(undefined)).toEqual({});
    expect(userDataFrom(null)).toEqual({});
  });
});
