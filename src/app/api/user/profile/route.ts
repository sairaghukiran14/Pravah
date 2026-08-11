import { z } from 'zod';
import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { notFound } from '@/lib/api/errors';

export const GET = route({}, async ({ userId }) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      credits: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
  });

  if (!user) throw notFound('User not found');
  return user;
});

const updateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
});

export const PUT = route({ body: updateSchema }, async ({ userId, body }) => {
  return prisma.user.update({
    where: { id: userId },
    data: { name: body.name },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      credits: true,
      createdAt: true,
    },
  });
});
