import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { notFound } from '@/lib/api/errors';

type Params = { id: string };

export const GET = route<undefined, undefined, Params>({}, async ({ userId, params }) => {
  const project = await prisma.project.findFirst({
    where: { id: params.id, userId },
    include: {
      pipelines: {
        include: {
          nodes: true,
          _count: { select: { runs: true } },
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
  });

  if (!project) throw notFound('Project not found');
  return project;
});

export const DELETE = route<undefined, undefined, Params>({}, async ({ userId, params }) => {
  // Scoped delete: deleteMany with the userId filter cannot remove another
  // user's project, and reports 0 rows instead of throwing when there is no match.
  const result = await prisma.project.deleteMany({
    where: { id: params.id, userId },
  });

  if (result.count === 0) throw notFound('Project not found');
  return { success: true };
});
