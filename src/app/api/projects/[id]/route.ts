import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { recordAudit } from '@/lib/api/audit';
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

export const DELETE = route<undefined, undefined, Params>({}, async ({ userId, params, req }) => {
  // Read first so the audit line can name what was removed — after the delete
  // there is nothing left to describe.
  const existing = await prisma.project.findFirst({
    where: { id: params.id, userId },
    select: { name: true, _count: { select: { pipelines: true } } },
  });

  // Scoped delete: deleteMany with the userId filter cannot remove another
  // user's project, and reports 0 rows instead of throwing when there is no match.
  const result = await prisma.project.deleteMany({
    where: { id: params.id, userId },
  });

  if (result.count === 0) throw notFound('Project not found');

  await recordAudit({
    userId,
    action: 'project.delete',
    targetType: 'project',
    targetId: params.id,
    metadata: { name: existing?.name, pipelines: existing?._count.pipelines },
    req,
  });

  return { success: true };
});
