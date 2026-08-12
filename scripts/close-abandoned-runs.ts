/**
 * Closes out runs left `running` by a process that died before it could settle.
 *
 * The reaper in credits.ts handles this going forward, but only for a user who
 * starts another run — an account that gave up still has rows sitting open.
 * This performs the same close-out across every account at once.
 *
 *   npx tsx scripts/close-abandoned-runs.ts           # dry run
 *   npx tsx scripts/close-abandoned-runs.ts --apply   # perform
 *
 * Credit is returned only where a hold is still recorded. Rows predating the
 * reservedCredits column carry null, and whatever happened to that credit
 * happened before there was any record of it — inventing a refund now would be
 * a guess, so those are closed without one.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { STALE_RUN_MINUTES } from '../src/lib/api/credits';

const APPLY = process.argv.includes('--apply');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

async function main() {
  const cutoff = new Date(Date.now() - STALE_RUN_MINUTES * 60_000);

  const stale = await prisma.pipelineRun.findMany({
    where: { status: 'running', startedAt: { lt: cutoff } },
    select: {
      id: true,
      startedAt: true,
      reservedCredits: true,
      pipeline: { select: { project: { select: { userId: true } } } },
    },
  });

  console.log(
    `${APPLY ? 'APPLYING' : 'DRY RUN'} — ${stale.length} run(s) stuck for over ${STALE_RUN_MINUTES} minutes\n`
  );

  const refunds = new Map<string, number>();

  for (const run of stale) {
    const userId = run.pipeline.project.userId;
    const held = run.reservedCredits ?? 0;
    if (held > 0) refunds.set(userId, (refunds.get(userId) ?? 0) + held);
    console.log(
      `  ${run.id}  started ${run.startedAt.toISOString()}  held ${
        run.reservedCredits === null ? 'n/a (predates the column)' : held
      }`
    );
  }

  if (APPLY && stale.length > 0) {
    const ids = stale.map((r) => r.id);
    await prisma.$transaction([
      prisma.pipelineRun.updateMany({
        where: { id: { in: ids } },
        data: { status: 'failed', finishedAt: new Date(), reservedCredits: null },
      }),
      prisma.nodeRun.updateMany({
        where: { runId: { in: ids }, status: { in: ['pending', 'running'] } },
        data: {
          status: 'failed',
          error: `Run abandoned — no progress for over ${STALE_RUN_MINUTES} minutes.`,
          finishedAt: new Date(),
        },
      }),
      ...[...refunds.entries()].map(([userId, amount]) =>
        prisma.user.update({ where: { id: userId }, data: { credits: { increment: amount } } })
      ),
    ]);
  }

  const refunded = [...refunds.values()].reduce((a, b) => a + b, 0);
  console.log(
    `\n${APPLY ? 'Closed' : 'Would close'} ${stale.length} run(s); ` +
      `${APPLY ? 'returned' : 'would return'} ${refunded} credit across ${refunds.size} account(s).`
  );
  if (!APPLY && stale.length > 0) console.log('Re-run with --apply to perform these changes.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
