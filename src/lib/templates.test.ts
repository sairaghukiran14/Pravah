import { describe, it, expect } from 'vitest';
import { PIPELINE_TEMPLATES, computeAutoLayout, createGraphFromTemplate } from './templates';
import { Node, Edge } from '@xyflow/react';

describe('Pipeline Templates & Auto-Layout', () => {
  it('defines valid starter templates including signature Indic AI bots', () => {
    expect(PIPELINE_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    PIPELINE_TEMPLATES.forEach((tpl) => {
      expect(tpl.id).toBeTruthy();
      expect(tpl.name).toBeTruthy();
      expect(tpl.nodes.length).toBeGreaterThan(0);
      expect(tpl.edges.length).toBeGreaterThan(0);
    });
  });

  it('generates fully connected graphs from each template', () => {
    PIPELINE_TEMPLATES.forEach((tpl) => {
      const graph = createGraphFromTemplate(tpl);
      expect(graph.nodes.length).toBe(tpl.nodes.length);
      expect(graph.edges.length).toBe(tpl.edges.length);

      // Verify each node has a valid position assigned
      graph.nodes.forEach((node) => {
        expect(node.position.x).toBeGreaterThanOrEqual(80);
        expect(node.position.y).toBeGreaterThanOrEqual(40);
      });
    });
  });

  it('computes sequential horizontal ranks for linear graphs', () => {
    const nodes: Node[] = [
      { id: '1', position: { x: 0, y: 0 }, data: {} },
      { id: '2', position: { x: 0, y: 0 }, data: {} },
      { id: '3', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
    ];

    const laidOut = computeAutoLayout(nodes, edges, { columnSpacing: 300, startX: 100 });
    const n1 = laidOut.find((n) => n.id === '1')!;
    const n2 = laidOut.find((n) => n.id === '2')!;
    const n3 = laidOut.find((n) => n.id === '3')!;

    expect(n1.position.x).toBe(100);
    expect(n2.position.x).toBe(400);
    expect(n3.position.x).toBe(700);
  });

  it('handles empty graphs safely', () => {
    expect(computeAutoLayout([], [])).toEqual([]);
  });
});
