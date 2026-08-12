/**
 * One-time backfill: records the seed fingerprint on library pipelines created
 * before that column existed.
 *
 * Without it every pre-existing pipeline has a null fingerprint, which means
 * seedLibrary can never tell an untouched copy from an edited one and will
 * therefore never carry a corrected template to those accounts — exactly the
 * gap that made the Document QA Bot need a bespoke repair script.
 *
 * A pipeline is stamped only when it currently hashes to the shipped template,
 * i.e. it is demonstrably untouched. Anything else is left null, which is the
 * safe direction: null simply means "never auto-upgrade this one".
 *
 *   npx tsx scripts/stamp-library-fingerprints.ts           # dry run
 *   npx tsx scripts/stamp-library-fingerprints.ts --apply   # perform
 *
 * Imports the same hashing used at runtime, so the stamp can never drift from
 * what seedLibrary will later compare against.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { LIBRARY_PIPELINES } from '../src/lib/libraryTemplates';
import { fingerprintTemplate, fingerprintPipeline } from '../src/lib/libraryFingerprint';
import { LIBRARY_PROJECT_NAME, normalizeLibraryPipelineName } from '../src/lib/libraryConstants';

const APPLY = process.argv.includes('--apply');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

async function main() {
  const shipped = new Map(
    LIBRARY_PIPELINES.map((t) => [normalizeLibraryPipelineName(t.name), fingerprintTemplate(t)])
  );

  const projects = await prisma.project.findMany({
    where: { name: LIBRARY_PROJECT_NAME },
    select: { id: true, user: { select: { email: true, id: true } } },
  });

  console.log(
    `${APPLY ? 'APPLYING' : 'DRY RUN'} — ${projects.length} Library projects, ${shipped.size} templates\n`
  );

  const tally = { stamped: 0, alreadyStamped: 0, diverged: 0, notLibrary: 0 };

  for (const project of projects) {
    const pipelines = await prisma.pipeline.findMany({
      where: { projectId: project.id },
      include: { nodes: true, edges: true },
    });

    const lines: string[] = [];

    for (const pipeline of pipelines) {
      const key = normalizeLibraryPipelineName(pipeline.name);
      const shippedHash = shipped.get(key);

      if (!shippedHash) {
        tally.notLibrary++;
        continue;
      }
      if (pipeline.seedFingerprint) {
        tally.alreadyStamped++;
        continue;
      }

      const current = fingerprintPipeline(pipeline.nodes, pipeline.edges);

      if (current === shippedHash) {
        tally.stamped++;
        lines.push(`    stamp     ${pipeline.name}`);
        if (APPLY) {
          await prisma.pipeline.update({
            where: { id: pipeline.id },
            data: { seedFingerprint: current },
          });
        }
      } else {
        tally.diverged++;
        lines.push(`    diverged  ${pipeline.name}  — left unstamped`);
      }
    }

    if (lines.length) {
      console.log(project.user?.email || project.user?.id || project.id);
      lines.forEach((l) => console.log(l));
    }
  }

  console.log(
    `\n${APPLY ? 'Stamped' : 'Would stamp'} ${tally.stamped}. ` +
      `${tally.alreadyStamped} already stamped, ${tally.diverged} diverged from the shipped template ` +
      `(left unstamped), ${tally.notLibrary} not library pipelines.`
  );
  if (!APPLY && tally.stamped > 0) console.log('Re-run with --apply to perform these changes.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
