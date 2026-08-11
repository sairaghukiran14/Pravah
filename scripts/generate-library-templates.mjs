import dotenv from 'dotenv';
import { writeFileSync } from 'fs';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

// Reference account whose Library is the cleanest canonical set.
const REFERENCE_EMAIL = 'avulasairaghukiran@gmail.com';
// Personal one-offs that must never become part of the shipped library.
const EXCLUDE = new Set(['test', 'Image Test Pipeline', 'TEST']);

const lib = await prisma.project.findFirst({
  where: { name: 'Library', user: { email: REFERENCE_EMAIL } },
  include: { pipelines: { include: { nodes: true, edges: true } } },
});

if (!lib) throw new Error('Reference Library not found');

const pipelines = lib.pipelines
  .filter((p) => !EXCLUDE.has(p.name.trim()))
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

/**
 * Strip anything that points at the reference account's own uploads. These
 * templates ship to every user, and the source library had real files attached
 * to its input nodes (a recording, a résumé, a bill). Shipping those would put
 * one person's private documents in everyone's workspace — and every copy would
 * be a broken reference anyway, since object access is owner-scoped.
 */
function sanitizeConfig(config) {
  if (!config || typeof config !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(config)) {
    const blob = JSON.stringify(v) ?? '';
    if (/audio_input_|tts_run_|\/api\/audio\//.test(blob)) continue; // drop attached files
    out[k] = v;
  }
  return out;
}

const templates = pipelines.map((p) => {
  // Stable ordering so generated output is deterministic.
  const nodes = [...p.nodes].sort((a, b) => a.positionX - b.positionX || a.positionY - b.positionY);
  const indexOf = new Map(nodes.map((n, i) => [n.id, i]));

  const edges = p.edges
    .filter((e) => indexOf.has(e.source) && indexOf.has(e.target))
    .map((e) => ({
      source: indexOf.get(e.source),
      target: indexOf.get(e.target),
      ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
      ...(e.targetHandle ? { targetHandle: e.targetHandle } : {}),
    }))
    .sort((a, b) => a.source - b.source || a.target - b.target);

  return {
    name: p.name.trim(),
    description: p.description || '',
    nodes: nodes.map((n) => ({
      type: n.type,
      label: n.label,
      x: n.positionX,
      y: n.positionY,
      config: sanitizeConfig(n.config),
    })),
    edges,
  };
});

const header = `/**
 * Canonical pipeline library shipped to every account.
 *
 * Each new user receives their own editable copy of these on signup (see
 * seedLibrary), and the dashboard surfaces them under "Quick Access".
 *
 * Generated from the reference Library so the shapes match what was built and
 * tested in the editor. Edit here — this is the source of truth; the previous
 * approach of running one-off scripts per account is what left different users
 * with different libraries.
 */

export interface LibraryNodeTemplate {
  type: string;
  label: string;
  x: number;
  y: number;
  config: Record<string, any>;
}

export interface LibraryEdgeTemplate {
  /** Index into the pipeline's nodes array. */
  source: number;
  target: number;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface LibraryPipelineTemplate {
  name: string;
  description: string;
  nodes: LibraryNodeTemplate[];
  edges: LibraryEdgeTemplate[];
}

export const LIBRARY_PIPELINES: LibraryPipelineTemplate[] = `;

writeFileSync(
  'src/lib/libraryTemplates.ts',
  header + JSON.stringify(templates, null, 2) + ';\n'
);

console.log(`Wrote ${templates.length} pipeline templates to src/lib/libraryTemplates.ts`);
for (const t of templates) console.log(`  ${t.name} [${t.nodes.length}n/${t.edges.length}e]`);

await prisma.$disconnect();
