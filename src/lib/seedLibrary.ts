import prisma from '@/lib/prisma';
import { LIBRARY_PIPELINES, type LibraryPipelineTemplate } from '@/lib/libraryTemplates';
import {
  LIBRARY_PROJECT_NAME,
  LIBRARY_PROJECT_DESCRIPTION,
  LEGACY_LIBRARY_PROJECT_NAME,
  normalizeLibraryPipelineName,
} from '@/lib/libraryConstants';
import {
  fingerprintTemplate,
  fingerprintPipeline,
  userDataFrom,
} from '@/lib/libraryFingerprint';

/**
 * Gives an account its own copy of the shipped pipeline library.
 *
 * Runs on signup, and is safe to re-run: it only adds what is missing, so it
 * doubles as the backfill for accounts created before the library existed and
 * as a repair for accounts whose library is incomplete. It never edits or
 * deletes a pipeline the user already has — someone may have customised a copy.
 */
export async function seedLibrary(userId: string): Promise<{
  projectId: string;
  created: number;
  renamed: number;
  upgraded: number;
  skipped: number;
}> {
  const project = await ensureLibraryProject(userId);

  const existing = await prisma.pipeline.findMany({
    where: { projectId: project.id },
    include: { nodes: true, edges: true },
  });

  // Compared by normalized name so a pipeline seeded under older numbering is
  // recognised as the same workflow rather than duplicated.
  const byNormalized = new Map(
    existing.map((p) => [normalizeLibraryPipelineName(p.name), p])
  );

  const missing: LibraryPipelineTemplate[] = [];
  const renames: { id: string; name: string }[] = [];
  const upgrades: { pipeline: (typeof existing)[number]; template: LibraryPipelineTemplate }[] = [];

  for (const template of LIBRARY_PIPELINES) {
    const match = byNormalized.get(normalizeLibraryPipelineName(template.name));

    if (!match) {
      missing.push(template);
      continue;
    }

    // A corrected template reaches an existing account only when that account's
    // copy is provably untouched: its current shape still hashes to what was
    // seeded. Anything the user edited stops matching and is left alone.
    const shipped = fingerprintTemplate(template);
    const current = fingerprintPipeline(match.nodes, match.edges);

    if (match.seedFingerprint && match.seedFingerprint === current && current !== shipped) {
      upgrades.push({ pipeline: match, template });
    } else if (match.name.trim() !== template.name) {
      // Same workflow under an old label — align the name only. Nodes, edges
      // and any customisation the user made are left untouched.
      renames.push({ id: match.id, name: template.name });
    }
  }

  if (missing.length > 0) {
    await createPipelinesFromTemplates(project.id, missing);
  }

  for (const r of renames) {
    await prisma.pipeline.update({ where: { id: r.id }, data: { name: r.name } });
  }

  for (const u of upgrades) {
    await upgradePipelineToTemplate(u.pipeline, u.template);
  }

  return {
    projectId: project.id,
    created: missing.length,
    renamed: renames.length,
    upgraded: upgrades.length,
    skipped:
      LIBRARY_PIPELINES.length - missing.length - renames.length - upgrades.length,
  };
}

/**
 * Rebuilds an untouched library pipeline from the current template.
 *
 * Uploads are carried over: a pipeline holding a file is still the stock
 * workflow, so correcting the workflow must not silently detach the document
 * the user attached to it.
 */
async function upgradePipelineToTemplate(
  pipeline: { id: string; nodes: { type: string; config: any }[] },
  template: LibraryPipelineTemplate
): Promise<void> {
  const nodeIds = template.nodes.map((n, i) => `node_${n.type}_${i}_${rid()}`);

  const nodes = template.nodes.map((n, i) => {
    const previous = pipeline.nodes.filter((o) => o.type === n.type);
    const carried = previous.length === 1 ? userDataFrom(previous[0].config) : {};
    return {
      id: nodeIds[i],
      pipelineId: pipeline.id,
      type: n.type,
      label: n.label,
      positionX: n.x,
      positionY: n.y,
      config: { ...n.config, ...carried } as any,
    };
  });

  await prisma.$transaction([
    prisma.pipelineEdge.deleteMany({ where: { pipelineId: pipeline.id } }),
    prisma.pipelineNode.deleteMany({ where: { pipelineId: pipeline.id } }),
    prisma.pipelineNode.createMany({ data: nodes }),
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
      data: {
        name: template.name,
        description: template.description,
        seedFingerprint: fingerprintTemplate(template),
      },
    }),
  ]);
}

/**
 * Finds the user's Library, creating it if absent. An older "Sample Project"
 * is renamed rather than left behind, so the user keeps anything they built in
 * it and does not end up with two starter projects.
 */
async function ensureLibraryProject(userId: string) {
  const library = await prisma.project.findFirst({
    where: { userId, name: LIBRARY_PROJECT_NAME },
  });
  if (library) return library;

  const legacy = await prisma.project.findFirst({
    where: { userId, name: 'Sample Project' },
  });
  if (legacy) {
    return prisma.project.update({
      where: { id: legacy.id },
      data: { name: LIBRARY_PROJECT_NAME, description: LIBRARY_PROJECT_DESCRIPTION },
    });
  }

  return prisma.project.create({
    data: {
      userId,
      name: LIBRARY_PROJECT_NAME,
      description: LIBRARY_PROJECT_DESCRIPTION,
    },
  });
}

const rid = () => Math.random().toString(36).slice(2, 11);

/**
 * Writes the whole library in three statements rather than one round trip per
 * pipeline.
 *
 * This runs inside the sign-in callback, so latency is the constraint: creating
 * the pipelines one at a time with nested node and edge writes meant ~20
 * sequential round trips (plus 111 nodes and 91 edges), which measured at ~38
 * seconds against a remote database — far past the point where a serverless
 * function is killed, leaving a new account with a partial library.
 */
async function createPipelinesFromTemplates(
  projectId: string,
  templates: LibraryPipelineTemplate[]
): Promise<void> {
  const pipelines: {
    id: string;
    projectId: string;
    name: string;
    description: string;
    seedFingerprint: string;
  }[] = [];
  const nodes: {
    id: string;
    pipelineId: string;
    type: string;
    label: string;
    positionX: number;
    positionY: number;
    config: any;
  }[] = [];
  const edges: {
    id: string;
    pipelineId: string;
    source: string;
    target: string;
    sourceHandle: string | null;
    targetHandle: string | null;
  }[] = [];

  for (const template of templates) {
    const pipelineId = `pipe_${rid()}`;
    pipelines.push({
      id: pipelineId,
      projectId,
      name: template.name,
      description: template.description,
      // Recorded so a later correction to this template can tell an untouched
      // copy from one the user has edited.
      seedFingerprint: fingerprintTemplate(template),
    });

    // Ids are generated per copy; template edges reference nodes by index.
    const nodeIds = template.nodes.map((n, i) => `node_${n.type}_${i}_${rid()}`);

    template.nodes.forEach((n, i) => {
      nodes.push({
        id: nodeIds[i],
        pipelineId,
        type: n.type,
        label: n.label,
        positionX: n.x,
        positionY: n.y,
        config: n.config,
      });
    });

    for (const e of template.edges) {
      edges.push({
        id: `edge_${rid()}`,
        pipelineId,
        source: nodeIds[e.source],
        target: nodeIds[e.target],
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
      });
    }
  }

  // One transaction so a partially-written library can never be observed.
  await prisma.$transaction([
    prisma.pipeline.createMany({ data: pipelines }),
    prisma.pipelineNode.createMany({ data: nodes }),
    prisma.pipelineEdge.createMany({ data: edges }),
  ]);
}
