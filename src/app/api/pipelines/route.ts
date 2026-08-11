import { z } from 'zod';
import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { forbidden } from '@/lib/api/errors';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: z.string().max(1000).optional(),
  projectId: z.string().min(1, 'projectId is required'),
  cloneFromId: z.string().optional(),
});

export const POST = route({ body: createSchema }, async ({ userId, body }) => {
  const { name, description, projectId, cloneFromId } = body;

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
