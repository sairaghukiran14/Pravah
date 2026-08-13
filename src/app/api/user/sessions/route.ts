import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { recordAudit } from '@/lib/api/audit';

/**
 * Sign out everywhere.
 *
 * With the JWT strategy there is no server-side session row to delete, so
 * revocation is a claim tokens are checked against: every issued token carries
 * the time it was minted, and the auth callback refuses any minted before this
 * moment. That makes a stolen token useless without waiting for it to expire.
 *
 * The caller's own session is revoked too. Signing out other devices but
 * silently keeping this one would be surprising, and someone reaching for this
 * usually believes the account is compromised.
 */
export const POST = route({ cost: 5 }, async ({ userId, req }) => {
  const revokedAt = new Date();

  await prisma.user.update({
    where: { id: userId },
    data: { sessionsRevokedAt: revokedAt },
  });

  // The Session table is unused under the JWT strategy, but rows may exist from
  // before the switch. Clearing them keeps the two consistent.
  await prisma.session.deleteMany({ where: { userId } }).catch(() => {});

  await recordAudit({ userId, action: 'session.revoke', req });

  return {
    success: true,
    revokedAt: revokedAt.toISOString(),
    message: 'All sessions signed out. You will need to sign in again.',
  };
});
