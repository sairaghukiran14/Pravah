#!/usr/bin/env node
/**
 * Gives every existing account its copy of the shipped pipeline library.
 *
 * Accounts predate the library or were seeded under the old "Sample Project"
 * name, so they never saw the dashboard's Quick Access section. This brings
 * them all to the same state.
 *
 * Strictly additive: it creates the Library project if absent, renames a legacy
 * "Sample Project" to keep whatever the user built in it, and adds only the
 * templates the account is missing. Nothing is deleted or overwritten.
 *
 *   node scripts/backfill-library.mjs           # dry run — reports the plan
 *   node scripts/backfill-library.mjs --apply   # perform the changes
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const APPLY = process.argv.includes('--apply');

// Read the templates out of the TS source so this script needs no build step.
function loadTemplates() {
  const src = readFileSync('src/lib/libraryTemplates.ts', 'utf8');
  const marker = 'LIBRARY_PIPELINES: LibraryPipelineTemplate[] = ';
  const json = src.slice(src.indexOf(marker) + marker.length).trim().replace(/;\s*$/, '');
  return JSON.parse(json);
}

// Mirrors normalizeLibraryPipelineName in src/lib/libraryConstants.ts; kept
// inline so this script runs without a TypeScript build step.
function normalize(name) {
  return name
    .trim()
    .replace(/^\d+\.\s*/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const LIBRARY_PROJECT_NAME = 'Library';
const LEGACY_LIBRARY_PROJECT_NAME = 'Sample Project';
const LIBRARY_PROJECT_DESCRIPTION =
  'A consolidated library of ready-to-run Indic speech, translation and document pipelines.';

const templates = loadTemplates();
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

const users = await prisma.user.findMany({
  select: { id: true, email: true },
  orderBy: { createdAt: 'asc' },
});

console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} — ${users.length} accounts, ${templates.length} templates\n`);

let totalCreated = 0;

for (const user of users) {
  let project = await prisma.project.findFirst({
    where: { userId: user.id, name: LIBRARY_PROJECT_NAME },
  });
  let action = 'existing Library';

  if (!project) {
    const legacy = await prisma.project.findFirst({
      where: { userId: user.id, name: LEGACY_LIBRARY_PROJECT_NAME },
    });
    if (legacy) {
      action = 'rename "Sample Project" -> "Library"';
      if (APPLY) {
        project = await prisma.project.update({
          where: { id: legacy.id },
          data: { name: LIBRARY_PROJECT_NAME, description: LIBRARY_PROJECT_DESCRIPTION },
        });
      } else {
        project = legacy;
      }
    } else {
      action = 'create Library';
      if (APPLY) {
        project = await prisma.project.create({
          data: {
            userId: user.id,
            name: LIBRARY_PROJECT_NAME,
            description: LIBRARY_PROJECT_DESCRIPTION,
          },
        });
      }
    }
  }

  const existing = project
    ? await prisma.pipeline.findMany({
        where: { projectId: project.id },
        select: { id: true, name: true },
      })
    : [];

  // Normalized comparison so the same workflow seeded under older numbering
  // ("1. Voice-to-Voice Translation" vs "4. Voice-to-Voice Translation") is
  // recognised rather than duplicated.
  const byNormalized = new Map(existing.map((p) => [normalize(p.name), p]));

  const missing = [];
  const toRename = [];
  for (const t of templates) {
    const match = byNormalized.get(normalize(t.name));
    if (!match) missing.push(t);
    else if (match.name.trim() !== t.name) toRename.push({ id: match.id, from: match.name, to: t.name });
  }

  const renameNote = toRename.length ? `, ${toRename.length} renamed` : '';
  console.log(
    `${(user.email || user.id).padEnd(34)} ${action.padEnd(34)} +${missing.length} pipelines${renameNote}`
  );
  for (const r of toRename) console.log(`     rename: "${r.from}" -> "${r.to}"`);

  if (APPLY && project) {
    for (const r of toRename) {
      await prisma.pipeline.update({ where: { id: r.id }, data: { name: r.to } });
    }
    for (const t of missing) {
      const nodeIds = t.nodes.map(
        (n, i) => `node_${n.type}_${i}_${Math.random().toString(36).slice(2, 9)}`
      );
      await prisma.pipeline.create({
        data: {
          projectId: project.id,
          name: t.name,
          description: t.description,
          nodes: {
            create: t.nodes.map((n, i) => ({
              id: nodeIds[i],
              type: n.type,
              label: n.label,
              positionX: n.x,
              positionY: n.y,
              config: n.config,
            })),
          },
          edges: {
            create: t.edges.map((e) => ({
              id: `edge_${Math.random().toString(36).slice(2, 9)}`,
              source: nodeIds[e.source],
              target: nodeIds[e.target],
              sourceHandle: e.sourceHandle ?? null,
              targetHandle: e.targetHandle ?? null,
            })),
          },
        },
      });
    }
  }
  totalCreated += missing.length;
}

console.log(`\n${APPLY ? 'Created' : 'Would create'} ${totalCreated} pipelines across ${users.length} accounts.`);
if (!APPLY) console.log('Re-run with --apply to perform these changes.');

await prisma.$disconnect();
