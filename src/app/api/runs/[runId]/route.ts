import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { notFound } from '@/lib/api/errors';

type Params = { runId: string };

export const GET = route<undefined, undefined, Params>({}, async ({ userId, params }) => {
  const run = await prisma.pipelineRun.findFirst({
    where: { id: params.runId, pipeline: { project: { userId } } },
    include: { nodeRuns: true, pipeline: true },
  });

  if (!run) throw notFound('Run record not found');
  return run;
});
