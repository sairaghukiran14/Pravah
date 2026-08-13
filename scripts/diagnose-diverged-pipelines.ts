/**
 * Explains why a library pipeline no longer matches its shipped template.
 *
 * Divergence has two very different causes and the right response differs:
 * a user edited their copy (leave it alone), or it was seeded from an older
 * version of the template and never touched (safe to bring up to date). The
 * fingerprint alone cannot tell them apart, so this compares the actual shape.
 *
 *   npx tsx scripts/diagnose-diverged-pipelines.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { LIBRARY_PIPELINES } from '../src/lib/libraryTemplates';
import { fingerprintTemplate, fingerprintPipeline, withoutUserData } from '../src/lib/libraryFingerprint';
import { LIBRARY_PROJECT_NAME, normalizeLibraryPipelineName } from '../src/lib/libraryConstants';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

function describeDifference(
  pipelineNodes: { type: string; label: string; config: any }[],
  templateNodes: { type: string; label: string; config: any }[]
): string[] {
  const notes: string[] = [];

  const countByType = (nodes: { type: string }[]) =>
    nodes.reduce<Record<string, number>>((acc, n) => {
      acc[n.type] = (acc[n.type] ?? 0) + 1;
      return acc;
    }, {});

  const have = countByType(pipelineNodes);
  const want = countByType(templateNodes);

  for (const type of new Set([...Object.keys(have), ...Object.keys(want)])) {
    const h = have[type] ?? 0;
    const w = want[type] ?? 0;
    if (h !== w) notes.push(`${type}: has ${h}, template has ${w}`);
  }

  if (notes.length === 0) {
    // Same node types — so the difference is in labels or configuration.
    for (const templateNode of templateNodes) {
      const match = pipelineNodes.find((n) => n.type === templateNode.type);
      if (!match) continue;
      if (match.label !== templateNode.label) {
        notes.push(`${templateNode.type}: label "${match.label}" vs "${templateNode.label}"`);
      }
      const a = JSON.stringify(withoutUserData(match.config));
      const b = JSON.stringify(withoutUserData(templateNode.config));
      if (a !== b) {
        notes.push(`${templateNode.type}: config differs`);
        notes.push(`      stored:   ${a.slice(0, 120)}`);
        notes.push(`      template: ${b.slice(0, 120)}`);
      }
    }
  }

  return notes;
}

async function main() {
  const byName = new Map(
    LIBRARY_PIPELINES.map((t) => [normalizeLibraryPipelineName(t.name), t])
  );

  const projects = await prisma.project.findMany({
    where: { name: LIBRARY_PROJECT_NAME },
    select: { id: true, user: { select: { email: true, id: true } } },
  });

  let diverged = 0;

  for (const project of projects) {
    const pipelines = await prisma.pipeline.findMany({
      where: { projectId: project.id, seedFingerprint: null },
      include: { nodes: true, edges: true },
    });

    for (const pipeline of pipelines) {
      const template = byName.get(normalizeLibraryPipelineName(pipeline.name));
      if (!template) continue;

      if (fingerprintPipeline(pipeline.nodes, pipeline.edges) === fingerprintTemplate(template)) {
        continue; // matches after all — the stamper will pick it up
      }

      diverged++;
      console.log(`\n${project.user?.email || project.user?.id}`);
      console.log(`  ${pipeline.name}`);
      console.log(
        `    nodes ${pipeline.nodes.length} vs template ${template.nodes.length}, ` +
          `edges ${pipeline.edges.length} vs ${template.edges.length}`
      );
      for (const note of describeDifference(pipeline.nodes, template.nodes)) {
        console.log(`    ${note}`);
      }
    }
  }

  console.log(`\n${diverged} diverged pipeline(s) examined.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
