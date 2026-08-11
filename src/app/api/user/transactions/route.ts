import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';

export const GET = route({}, async ({ userId }) => {
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
});
