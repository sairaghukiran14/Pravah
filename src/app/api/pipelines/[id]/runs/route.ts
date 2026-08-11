import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { notFound } from '@/lib/api/errors';

type Params = { id: string };

export const GET = route<undefined, undefined, Params>({}, async ({ userId, params }) => {
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: params.id, project: { userId } },
    select: { id: true },
  });
  if (!pipeline) throw notFound('Pipeline not found');

  return prisma.pipelineRun.findMany({
    where: { pipelineId: params.id },
    include: { nodeRuns: true },
    orderBy: { startedAt: 'desc' },
    take: 20,
  });
});
