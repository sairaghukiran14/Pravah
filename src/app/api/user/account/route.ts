import { z } from 'zod';
import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { badRequest, notFound } from '@/lib/api/errors';
import { deleteAccountData } from '@/lib/api/retention';

/**
 * Erases the account and everything belonging to it.
 *
 * Irreversible and immediate — there is no soft delete and no grace period,
 * because a deletion request that leaves the data recoverable has not actually
 * been honoured.
 *
 * Confirmation is the account's own email address rather than a boolean. A
 * stray request cannot satisfy it, and the person sending it has to know what
 * they are deleting.
 */
const bodySchema = z.object({
  confirmEmail: z.string().trim().min(1, 'Confirmation is required'),
});

export const POST = route({ cost: 10, body: bodySchema }, async ({ userId, body }) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) throw notFound('Account not found');

  if (body.confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
    throw badRequest(
      'Type your account email address exactly to confirm deletion.'
    );
  }

  // No audit entry: the log cascades with the account, so writing one would
  // record an event into a table about to be erased. Deliberate — the
  // alternative is keeping a row about someone who asked to be forgotten.
  const result = await deleteAccountData(userId);

  return {
    success: true,
    objectsDeleted: result.objectsDeleted,
    // Surfaced rather than swallowed: if storage did not fully clear, the user
    // is entitled to know their data is not entirely gone yet.
    objectsFailed: result.objectsFailed.length,
    message: 'Your account and all associated data have been deleted.',
  };
});
