/**
 * Removes credit transactions belonging to accounts that no longer exist.
 *
 * CreditTransaction carried a userId with no foreign key behind it, so deleting
 * an account left its ledger rows in place pointing at nothing. They cannot be
 * attributed to anyone, cannot be reconciled against a balance, and cannot be
 * erased in response to a deletion request because nothing links them back.
 *
 * The relation is now declared with a cascade, and the database will refuse to
 * add the constraint while these rows exist — so this runs once, first.
 *
 *   npx tsx scripts/clean-orphaned-transactions.ts           # dry run
 *   npx tsx scripts/clean-orphaned-transactions.ts --apply   # perform
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

async function main() {
  const userIds = new Set((await prisma.user.findMany({ select: { id: true } })).map((u) => u.id));
  const transactions = await prisma.creditTransaction.findMany();

  const orphans = transactions.filter((t) => !userIds.has(t.userId));

  console.log(
    `${APPLY ? 'APPLYING' : 'DRY RUN'} — ${transactions.length} transactions, ${orphans.length} orphaned\n`
  );

  for (const o of orphans) {
    console.log(
      `  ${o.createdAt.toISOString().slice(0, 10)}  ${String(o.amount).padStart(8)}  ${o.type.padEnd(14)}  user ${o.userId} (missing)`
    );
  }

  if (APPLY && orphans.length > 0) {
    const res = await prisma.creditTransaction.deleteMany({
      where: { id: { in: orphans.map((o) => o.id) } },
    });
    console.log(`\nDeleted ${res.count} orphaned transaction(s).`);
  } else if (orphans.length > 0) {
    console.log('\nRe-run with --apply to delete these.');
  } else {
    console.log('Nothing to clean.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
