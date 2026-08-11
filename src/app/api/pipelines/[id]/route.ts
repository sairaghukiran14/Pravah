import { z } from 'zod';
import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { notFound } from '@/lib/api/errors';

type Params = { id: string };

export const GET = route<undefined, undefined, Params>({}, async ({ userId, params }) => {
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: params.id, project: { userId } },
    include: { nodes: true, edges: true },
  });

  if (!pipeline) throw notFound('Pipeline not found');
  return pipeline;
});

const nodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string().optional().default(''),
  positionX: z.coerce.number().optional(),
  positionY: z.coerce.number().optional(),
  position: z.object({ x: z.coerce.number(), y: z.coerce.number() }).partial().optional(),
  config: z.record(z.string(), z.any()).optional(),
});

const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  nodes: z.array(nodeSchema).max(500).optional(),
  edges: z.array(edgeSchema).max(1000).optional(),
});

export const PUT = route<z.infer<typeof updateSchema>, undefined, Params>(
  { body: updateSchema },
  async ({ userId, params, body }) => {
    const existing = await prisma.pipeline.findFirst({
      where: { id: params.id, project: { userId } },
      select: { id: true },
    });
    if (!existing) throw notFound('Pipeline not found');

    return prisma.$transaction(async (tx) => {
      await tx.pipelineEdge.deleteMany({ where: { pipelineId: params.id } });
      await tx.pipelineNode.deleteMany({ where: { pipelineId: params.id } });

      return tx.pipeline.update({
        where: { id: params.id },
        data: {
          name: body.name,
          description: body.description,
          nodes: {
            create: (body.nodes || []).map((n) => ({
              id: n.id,
              type: n.type,
              label: n.label || n.type,
              positionX: Number(n.positionX ?? n.position?.x ?? 0),
              positionY: Number(n.positionY ?? n.position?.y ?? 0),
              config: n.config || {},
            })),
          },
          edges: {
            create: (body.edges || []).map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle || null,
              targetHandle: e.targetHandle || null,
            })),
          },
        },
        include: { nodes: true, edges: true },
      });
    });
  }
);

export const DELETE = route<undefined, undefined, Params>({}, async ({ userId, params }) => {
  const existing = await prisma.pipeline.findFirst({
    where: { id: params.id, project: { userId } },
    select: { id: true },
  });
  if (!existing) throw notFound('Pipeline not found');

  await prisma.pipeline.delete({ where: { id: params.id } });
  return { success: true };
});
