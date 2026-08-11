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
 */

/** Ceiling held per run until the actual cost is known. */
export const RUN_RESERVATION = Number(process.env.RUN_RESERVATION_CREDITS || 10);

/** Max pipeline runs a single user may have in flight at once. */
export const MAX_CONCURRENT_RUNS = Number(process.env.MAX_CONCURRENT_RUNS || 3);

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
 * Settle a reservation against the real cost: refund the unused remainder, or
 * take the extra if the run cost more than was held.
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
  runId: string;
}): Promise<void> {
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
          description: `Pipeline run execution cost (Run ID: ${runId.substring(0, 8)})`,
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

export async function countActiveRuns(userId: string): Promise<number> {
  return prisma.pipelineRun.count({
    where: { status: 'running', pipeline: { project: { userId } } },
  });
}
