import { z } from 'zod';
import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';

const bodySchema = z.object({
  role: z.string().max(120).optional(),
  useCases: z.array(z.string().max(120)).max(20).optional(),
  languages: z.array(z.string().max(32)).max(30).optional(),
  scale: z.string().max(60).optional(),
});

export const POST = route({ body: bodySchema }, async ({ userId }) => {
  // Note: the survey answers above are accepted but not persisted — there are
  // no columns for them on User. Only the completion flag is stored.
  const user = await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompleted: true },
    select: { id: true, onboardingCompleted: true },
  });

  return { success: true, user };
});
