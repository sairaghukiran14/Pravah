/**
 * Applies the retention policy.
 *
 * Run history holds what a pipeline actually processed — call transcripts,
 * document text, synthesised audio — so it expires after 90 days along with
 * the stored objects it references. Audit metadata is kept a year: it holds no
 * customer content and is what an incident investigation needs, which is
 * usually discovered long after the fact.
 *
 *   npx tsx scripts/purge-expired-data.ts           # dry run — reports what would go
 *   npx tsx scripts/purge-expired-data.ts --apply   # perform the deletion
 *
 * Intended to run on a schedule. Until one exists, running it by hand is what
 * makes the policy real rather than aspirational.
 */

import 'dotenv/config';
import { purgeExpiredData, RUN_RETENTION_DAYS, AUDIT_RETENTION_DAYS } from '../src/lib/api/retention';
import prisma from '../src/lib/prisma';

const APPLY = process.argv.includes('--apply');

async function main() {
  console.log(
    `${APPLY ? 'APPLYING' : 'DRY RUN'} — runs older than ${RUN_RETENTION_DAYS} days, ` +
      `audit older than ${AUDIT_RETENTION_DAYS} days\n`
  );

  const result = await purgeExpiredData(!APPLY);

  console.log(`  pipeline runs   ${APPLY ? 'deleted' : 'expiring'}: ${result.runsDeleted}`);
  console.log(`  node runs       ${APPLY ? 'deleted' : 'expiring'}: ${result.nodeRunsDeleted}`);
  console.log(`  audit entries   ${APPLY ? 'deleted' : 'expiring'}: ${result.auditDeleted}`);
  console.log(`  stored objects  ${APPLY ? 'deleted' : 'expiring'}: ${result.objectsDeleted}`);

  if (result.objectsFailed.length > 0) {
    console.log(`\n  ${result.objectsFailed.length} object(s) could not be removed:`);
    for (const f of result.objectsFailed.slice(0, 20)) {
      console.log(`    ${f.key}: ${f.reason}`);
    }
    // The rows survive a storage failure on purpose, so the next pass retries.
    console.log('  Their rows were kept, so the next run will try again.');
  }

  if (!APPLY && (result.runsDeleted > 0 || result.auditDeleted > 0)) {
    console.log('\nRe-run with --apply to perform this deletion.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
