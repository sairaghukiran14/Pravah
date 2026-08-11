import { z } from 'zod';
import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';

export const GET = route({}, async ({ userId }) => {
  return prisma.project.findMany({
    where: { userId },
    include: {
      pipelines: { select: { id: true, name: true, description: true } },
      _count: { select: { pipelines: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
});

const createSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(120),
  description: z.string().max(1000).optional(),
});

export const POST = route({ body: createSchema }, async ({ userId, body }) => {
  const project = await prisma.project.create({
    data: { name: body.name, description: body.description, userId },
  });
  return Response.json(project, { status: 201 });
});
