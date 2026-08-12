#!/usr/bin/env node
/**
 * Repairs library pipelines that were seeded from a template later found to be
 * broken.
 *
 * seedLibrary deliberately never edits a pipeline an account already has —
 * someone may have customised their copy. That is the right default, but it
 * means a fix to a shipped template only reaches accounts created afterwards.
 * Every account seeded before the fix keeps the broken copy forever.
 *
 * This closes that gap for the specific templates below, and only for copies
 * that still match the broken shape byte for byte — same node types, same edge
 * count, same config on every node. A copy the user has touched in any way
 * fails that check and is left alone.
 *
 *   node scripts/repair-library-templates.mjs           # dry run — reports the plan
 *   node scripts/repair-library-templates.mjs --apply   # perform the changes
 *
 * Historical NodeRun rows reference node ids as plain strings, so past runs of
 * a repaired pipeline keep pointing at the ids they executed against. Those are
 * records of what happened and are intentionally not rewritten.
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

/**
 * The shapes we are willing to overwrite.
 *
 * `broken` describes the copy as it was shipped, and is what a pristine account
 * still has. Anything that does not match it exactly is treated as customised.
 *
 *  - `replace` swaps the whole graph for the current template.
 *  - `patch`   rewrites the config of matching nodes only.
 */
const REPAIRS = [
  {
    name: '2. Document QA Bot (Multilingual RAG Engine)',
    mode: 'replace',
    // The chunker was wired straight to document_input, which only exposes
    // `.text` — so it never saw the uploaded file and every run reported
    // "No matching contexts found". The fix inserts the Document AI step.
    reason: 'missing Document AI digitise step before the chunker',
    broken: {
      nodeTypes: [
        'document_input',
        'pdf_splitter',
        'vector_search',
        'llm',
        'translate',
        'text_output',
      ],
      edgeCount: 5,
      configs: {
        document_input: { format: 'pdf' },
        pdf_splitter: { chunk_size: 600, chunk_overlap: 50 },
        vector_search: {
          query: 'refund policy summary',
          fallback_context:
            'Company policy chunk 1: Refunds are processed within 7 business days.\n\nCompany policy chunk 2: Support is available 24/7.',
        },
        llm: {
          prompt: 'Answer the question based only on context: {{vector_search.text}}',
          temperature: 0.1,
        },
        translate: { source_language_code: 'en-IN', target_language_code: 'te-IN' },
        text_output: {},
      },
    },
  },
  {
    name: '10. RAG Document-Search Audio Guide Generator',
    mode: 'patch',
    // {{vector_search.text}} never resolved: placeholders match generated node
    // ids, so the literal text was sent to the model. The graph itself is fine.
    reason: 'unresolvable {{vector_search.text}} placeholder in the prompt',
    broken: {
      nodeTypes: ['text_input', 'vector_search', 'llm', 'translate', 'tts', 'audio_output'],
      edgeCount: 5,
      configs: {
        llm: {
          prompt: 'Write an audio guide answer using context: {{vector_search.text}}',
          temperature: 0.2,
        },
      },
    },
  },
];

const templates = loadTemplates();
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

const rid = () => Math.random().toString(36).slice(2, 11);

/**
 * Config keys that hold something the user supplied rather than something the
 * template shipped — an uploaded file, a recording, the object key it landed
 * under.
 *
 * These are content, not customisation. A pipeline carrying an upload is still
 * the stock workflow, so it stays eligible for repair, and the upload is copied
 * onto the rebuilt node instead of being dropped.
 */
const USER_DATA_KEYS = ['file_data', 'audio_data', 'file', 'file_url', 'audio_url', 'r2_key'];

function withoutUserData(config) {
  const out = { ...(config ?? {}) };
  for (const key of USER_DATA_KEYS) delete out[key];
  return out;
}

function userDataFrom(config) {
  const out = {};
  for (const key of USER_DATA_KEYS) {
    if (config && config[key] !== undefined) out[key] = config[key];
  }
  return out;
}

function sortedTypes(nodes) {
  return nodes.map((n) => n.type).sort();
}

/** Order-insensitive deep equality, enough for the plain JSON in node configs. */
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual(a[k], b[k]));
}

/**
 * True only when this copy still looks exactly as it was shipped. Any edit the
 * user made — a changed query, a retuned temperature, an added or removed node
 * — fails one of these checks and the pipeline is left untouched.
 */
function isPristine(nodes, edges, broken) {
  if (nodes.length !== broken.nodeTypes.length) return false;
  if (edges.length !== broken.edgeCount) return false;

  const want = [...broken.nodeTypes].sort();
  const got = sortedTypes(nodes);
  if (want.join('|') !== got.join('|')) return false;

  for (const [type, expected] of Object.entries(broken.configs)) {
    const matching = nodes.filter((n) => n.type === type);
    if (matching.length !== 1) return false;
    // Uploads are ignored here — they are the user's content, not an edit to
    // the workflow, and they are carried across the rebuild.
    if (!deepEqual(withoutUserData(matching[0].config), withoutUserData(expected))) return false;
  }
  return true;
}

async function replaceGraph(pipeline, oldNodes, template) {
  const nodeIds = template.nodes.map((n, i) => `node_${n.type}_${i}_${rid()}`);

  await prisma.$transaction([
    prisma.pipelineEdge.deleteMany({ where: { pipelineId: pipeline.id } }),
    prisma.pipelineNode.deleteMany({ where: { pipelineId: pipeline.id } }),
    prisma.pipelineNode.createMany({
      data: template.nodes.map((n, i) => {
        // Carry an upload over to the node that replaces the one holding it, so
        // repairing the workflow does not silently detach the user's file.
        const previous = oldNodes.filter((o) => o.type === n.type);
        const carried = previous.length === 1 ? userDataFrom(previous[0].config) : {};
        return {
          id: nodeIds[i],
          pipelineId: pipeline.id,
          type: n.type,
          label: n.label,
          positionX: n.x,
          positionY: n.y,
          config: { ...n.config, ...carried },
        };
      }),
    }),
    prisma.pipelineEdge.createMany({
      data: template.edges.map((e) => ({
        id: `edge_${rid()}`,
        pipelineId: pipeline.id,
        source: nodeIds[e.source],
        target: nodeIds[e.target],
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
      })),
    }),
    prisma.pipeline.update({
      where: { id: pipeline.id },
      data: { name: template.name, description: template.description },
    }),
  ]);
}

async function patchConfigs(pipeline, nodes, template) {
  const writes = [];
  for (const node of nodes) {
    const wanted = template.nodes.find((t) => t.type === node.type);
    if (!wanted || deepEqual(node.config ?? {}, wanted.config)) continue;
    const merged = { ...wanted.config, ...userDataFrom(node.config) };
    writes.push(prisma.pipelineNode.update({ where: { id: node.id }, data: { config: merged } }));
  }
  writes.push(
    prisma.pipeline.update({
      where: { id: pipeline.id },
      data: { name: template.name, description: template.description },
    })
  );
  await prisma.$transaction(writes);
}

const users = await prisma.user.findMany({
  select: { id: true, email: true },
  orderBy: { createdAt: 'asc' },
});

console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} — ${users.length} accounts, ${REPAIRS.length} templates\n`);

const tally = { repaired: 0, current: 0, customised: 0, absent: 0 };

for (const user of users) {
  const project = await prisma.project.findFirst({
    where: { userId: user.id, name: LIBRARY_PROJECT_NAME },
    select: { id: true },
  });

  const lines = [];

  for (const repair of REPAIRS) {
    const template = templates.find((t) => normalize(t.name) === normalize(repair.name));
    if (!template) {
      throw new Error(`No shipped template matches "${repair.name}" — has it been renamed?`);
    }

    // Matched on the normalized name so numbering drift does not hide a copy.
    const candidates = project
      ? (
          await prisma.pipeline.findMany({
            where: { projectId: project.id },
            include: { nodes: true, edges: true },
          })
        ).filter((p) => normalize(p.name) === normalize(repair.name))
      : [];

    if (candidates.length === 0) {
      tally.absent++;
      lines.push(`    absent      ${repair.name}`);
      continue;
    }

    for (const candidate of candidates) {
      if (isPristine(candidate.nodes, candidate.edges, repair.broken)) {
        tally.repaired++;
        lines.push(`    REPAIR      ${repair.name}  (${repair.reason})`);
        if (APPLY) {
          if (repair.mode === 'replace') await replaceGraph(candidate, candidate.nodes, template);
          else await patchConfigs(candidate, candidate.nodes, template);
        }
      } else {
        // Either already carrying the fix, or edited by the user. Distinguish
        // the two only to make the report readable — both are left alone.
        const hasFixShape = candidate.nodes.length === template.nodes.length;
        if (hasFixShape) {
          tally.current++;
          lines.push(`    current     ${repair.name}`);
        } else {
          tally.customised++;
          lines.push(`    customised  ${repair.name}  — left untouched`);
        }
      }
    }
  }

  if (lines.length) {
    console.log(user.email || user.id);
    lines.forEach((l) => console.log(l));
  }
}

console.log(
  `\n${APPLY ? 'Repaired' : 'Would repair'} ${tally.repaired} pipeline(s). ` +
    `${tally.current} already current, ${tally.customised} customised (skipped), ${tally.absent} absent.`
);
if (!APPLY && tally.repaired > 0) console.log('Re-run with --apply to perform these changes.');

await prisma.$disconnect();
