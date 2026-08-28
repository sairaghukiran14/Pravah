import { z } from 'zod';
import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { forbidden, notFound, badRequest } from '@/lib/api/errors';

type Params = { id: string };

const createVersionSchema = z.object({
  name: z.string().max(100),
  description: z.string().max(500).optional(),
});

export const GET = route<undefined, undefined, Params>(
  {},
  async ({ userId, params }) => {
    const pipelineId = params.id;

    // Verify ownership
    const owned = await prisma.pipeline.findFirst({
      where: { id: pipelineId, project: { userId } },
      select: { id: true },
    });
    if (!owned) throw forbidden('Pipeline not found or unauthorized');

    const versions = await prisma.pipelineVersion.findMany({
      where: { pipelineId },
      orderBy: { version: 'desc' },
    });

    return versions;
  }
);

export const POST = route<z.infer<typeof createVersionSchema>, undefined, Params>(
  { body: createVersionSchema },
  async ({ userId, params, body }) => {
    const pipelineId = params.id;

    // Fetch current pipeline topology and verify ownership
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: pipelineId, project: { userId } },
      include: { nodes: true, edges: true },
    });
    if (!pipeline) throw forbidden('Pipeline not found or unauthorized');

    if (pipeline.nodes.length === 0) {
      throw badRequest('Cannot snapshot an empty pipeline');
    }

    // Get next version number
    const lastVersion = await prisma.pipelineVersion.findFirst({
      where: { pipelineId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVerNum = (lastVersion?.version ?? 0) + 1;

    const snapshot = await prisma.pipelineVersion.create({
      data: {
        pipelineId,
        version: nextVerNum,
        name: body.name || `v${nextVerNum} Revision`,
        description: body.description || `Auto snapshot of current pipeline state`,
        nodes: pipeline.nodes.map(n => ({
          id: n.id,
          type: n.type,
          label: n.label,
          positionX: n.positionX,
          positionY: n.positionY,
          config: n.config,
        })),
        edges: pipeline.edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })),
      },
    });

    return snapshot;
  }
);
