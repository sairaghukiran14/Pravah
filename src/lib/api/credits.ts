import prisma from '@/lib/prisma';

/**
 * Wallet accounting for pipeline runs.
 *
 * Runs must reserve credit *before* doing any paid work. Checking the balance
 * and decrementing it later is not safe: several runs started at once all read
 * the same balance, all pass the check, and all proceed — letting a user with
 * one run's worth of credit consume many runs' worth of paid API calls.
 *
 * The reservation is a single conditional UPDATE, so concurrent callers
 * serialize on the row and only those with sufficient balance succeed.
 *
 * A hold is released exactly once. Both settlement and the stale-run reaper
 * first *claim* the hold by clearing `PipelineRun.reservedCredits` in a
 * conditional update; whichever gets there first does the refund and the other
 * becomes a no-op. Without that claim, a run that is reaped and then settles
 * late would return the same credit twice.
 */

/** Ceiling held per run until the actual cost is known. */
export const RUN_RESERVATION = Number(process.env.RUN_RESERVATION_CREDITS || 10);

/** Max pipeline runs a single user may have in flight at once. */
export const MAX_CONCURRENT_RUNS = Number(process.env.MAX_CONCURRENT_RUNS || 3);

/**
 * How long a run may stay `running` before it is presumed dead.
 *
 * A serverless function killed at its timeout never reaches the settlement in
 * its `finally` block, so the row stays `running` forever. Left alone those
 * rows accumulate against MAX_CONCURRENT_RUNS until the user cannot start a
 * run at all, with no way to clear it themselves.
 */
export const STALE_RUN_MINUTES = Number(process.env.STALE_RUN_MINUTES || 15);

export async function reserveCredits(
  userId: string,
  amount = RUN_RESERVATION
): Promise<boolean> {
  // Atomic: the WHERE clause and the decrement are evaluated together, so two
  // concurrent requests cannot both observe a sufficient balance.
  const result = await prisma.user.updateMany({
    where: { id: userId, credits: { gte: amount } },
    data: { credits: { decrement: amount } },
  });

  return result.count > 0;
}

/**
 * Take ownership of a run's hold. Returns true only for the caller that
 * transitions `reservedCredits` from set to null, so the refund that follows
 * can only happen once.
 */
async function claimReservation(runId: string, userId: string): Promise<boolean> {
  const claimed = await prisma.pipelineRun.updateMany({
    // Scoped to the owner as well as the id. Both current callers already pass
    // a run they own, but ownership belongs in the query rather than in the
    // discipline of the caller — this is the same rule the route handlers and
    // assertObjectAccess apply everywhere else.
    where: {
      id: runId,
      reservedCredits: { not: null },
      pipeline: { project: { userId } },
    },
    data: { reservedCredits: null },
  });
  return claimed.count > 0;
}

/**
 * Settle a reservation against the real cost: refund the unused remainder, or
 * take the extra if the run cost more than was held.
 *
 * `runId` is null only when the run row was never created, in which case there
 * is no hold recorded anywhere and the refund is unconditional.
 */
export async function settleCredits({
  userId,
  reserved,
  actualCost,
  runId,
}: {
  userId: string;
  reserved: number;
  actualCost: number;
  runId: string | null;
}): Promise<void> {
  if (runId !== null && !(await claimReservation(runId, userId))) {
    // Already settled or already reaped — the hold has been returned once.
    return;
  }

  const delta = reserved - actualCost; // >0 refund, <0 additional charge

  await prisma.$transaction(async (tx) => {
    if (delta !== 0) {
      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: delta } },
      });
    }

    if (actualCost > 0) {
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -actualCost,
          type: 'deduction',
          description: `Pipeline run execution cost (Run ID: ${(runId ?? 'unknown').substring(0, 8)})`,
        },
      });
    }
  });
}

/** Release a reservation in full — used when a run fails before doing paid work. */
export async function releaseReservation(userId: string, reserved: number): Promise<void> {
  if (reserved <= 0) return;
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: reserved } },
  });
}

function staleCutoff(): Date {
  return new Date(Date.now() - STALE_RUN_MINUTES * 60_000);
}

/**
 * Fail this user's abandoned runs and return the credit they were holding.
 *
 * Called before the concurrency check so a killed run costs the user one slot
 * for at most STALE_RUN_MINUTES rather than permanently.
 */
export async function reapStaleRuns(userId: string): Promise<number> {
  const stale = await prisma.pipelineRun.findMany({
    where: {
      status: 'running',
      startedAt: { lt: staleCutoff() },
      pipeline: { project: { userId } },
    },
    select: { id: true, reservedCredits: true },
  });

  if (stale.length === 0) return 0;

  let refund = 0;
  const reaped: string[] = [];

  for (const run of stale) {
    // Claim before counting the refund: a run that settles concurrently must
    // not also be refunded here.
    if (await claimReservation(run.id, userId)) {
      refund += run.reservedCredits ?? 0;
    }
    reaped.push(run.id);
  }

  await prisma.$transaction(async (tx) => {
    await tx.pipelineRun.updateMany({
      where: { id: { in: reaped } },
      data: { status: 'failed', finishedAt: new Date() },
    });

    await tx.nodeRun.updateMany({
      where: { runId: { in: reaped }, status: { in: ['pending', 'running'] } },
      data: {
        status: 'failed',
        error: `Run abandoned — no progress for over ${STALE_RUN_MINUTES} minutes.`,
        finishedAt: new Date(),
      },
    });

    if (refund > 0) {
      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: refund } },
      });
    }
  });

  return reaped.length;
}

/**
 * Runs currently in flight. Rows past the staleness cutoff are excluded so a
 * run whose process died cannot hold a concurrency slot indefinitely, even if
 * the reaper has not run yet.
 */
export async function countActiveRuns(userId: string): Promise<number> {
  return prisma.pipelineRun.count({
    where: {
      status: 'running',
      startedAt: { gte: staleCutoff() },
      pipeline: { project: { userId } },
    },
  });
}
