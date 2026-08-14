import { z } from 'zod';
import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { forbidden } from '@/lib/api/errors';

const nodeSchema = z.object({
  type: z.string(),
  label: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  config: z.record(z.string(), z.any()).optional(),
});

const edgeSchema = z.object({
  source: z.union([z.string(), z.number()]),
  target: z.union([z.string(), z.number()]),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
});

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: z.string().max(1000).optional(),
  projectId: z.string().min(1, 'projectId is required'),
  cloneFromId: z.string().optional(),
  nodes: z.array(nodeSchema).optional(),
  edges: z.array(edgeSchema).optional(),
});

export const POST = route({ body: createSchema }, async ({ userId, body }) => {
  const { name, description, projectId, cloneFromId, nodes, edges } = body;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw forbidden('Project not found or unauthorized');

  let initialNodes: any[] = [];
  let initialEdges: any[] = [];

  if (cloneFromId) {
    // Scoped to the requesting user: without this, any authenticated user who
    // learns another user's pipeline id could clone its full node graph.
    const sourcePipeline = await prisma.pipeline.findFirst({
      where: { id: cloneFromId, project: { userId } },
      include: { nodes: true, edges: true },
    });

    if (!sourcePipeline) throw forbidden('Source pipeline not found or unauthorized');

    const nodeIdMap: Record<string, string> = {};

    initialNodes = sourcePipeline.nodes.map((n) => {
      const newId = `node_${n.type}_clone_${Math.random().toString(36).substring(7)}`;
      nodeIdMap[n.id] = newId;
      return {
        id: newId,
        type: n.type,
        label: n.label,
        positionX: n.positionX,
        positionY: n.positionY,
        config: n.config || {},
      };
    });

    initialEdges = sourcePipeline.edges.map((e) => ({
      id: `edge_clone_${Math.random().toString(36).substring(7)}`,
      source: nodeIdMap[e.source] || e.source,
      target: nodeIdMap[e.target] || e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }));
  } else if (nodes && nodes.length > 0) {
    const rid = () => Math.random().toString(36).substring(2, 11);
    const nodeIds = nodes.map((n) => `node_${n.type}_${Math.random().toString(36).substring(7)}`);

    initialNodes = nodes.map((n, i) => ({
      id: nodeIds[i],
      type: n.type,
      label: n.label || n.type,
      positionX: n.positionX ?? n.x ?? 0,
      positionY: n.positionY ?? n.y ?? 0,
      config: n.config || {},
    }));

    initialEdges = (edges || []).map((e) => {
      const sourceIdx = typeof e.source === 'number' ? e.source : parseInt(String(e.source), 10);
      const targetIdx = typeof e.target === 'number' ? e.target : parseInt(String(e.target), 10);

      const sourceId = !isNaN(sourceIdx) && nodeIds[sourceIdx] ? nodeIds[sourceIdx] : String(e.source);
      const targetId = !isNaN(targetIdx) && nodeIds[targetIdx] ? nodeIds[targetIdx] : String(e.target);

      return {
        id: `edge_${rid()}`,
        source: sourceId,
        target: targetId,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null,
      };
    });
  }

  const pipeline = await prisma.pipeline.create({
    data: {
      name,
      description,
      projectId,
      nodes: { create: initialNodes },
      edges: { create: initialEdges },
    },
    include: { nodes: true, edges: true },
  });

  return Response.json(pipeline, { status: 201 });
});
