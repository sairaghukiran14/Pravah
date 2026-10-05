import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { notFound } from '@/lib/api/errors';

type Params = { id: string };

/**
 * DELETE /api/user/api-keys/:id
 * Revokes / deletes a specific API key belonging to the user.
 */
export const DELETE = route<undefined, undefined, Params>(
  { auth: true },
  async ({ userId, params }) => {
    const key = await prisma.apiKey.findFirst({
      where: { id: params.id, userId },
      select: { id: true, name: true },
    });

    if (!key) {
      throw notFound('API Key not found or unauthorized');
    }

    await prisma.apiKey.delete({
      where: { id: params.id },
    });

    return {
      success: true,
      message: `API Key "${key.name}" has been revoked and can no longer be used.`,
    };
  }
);
