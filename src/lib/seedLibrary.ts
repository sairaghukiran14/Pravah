import prisma from '@/lib/prisma';
import { LIBRARY_PIPELINES, type LibraryPipelineTemplate } from '@/lib/libraryTemplates';
import {
  LIBRARY_PROJECT_NAME,
  LIBRARY_PROJECT_DESCRIPTION,
  LEGACY_LIBRARY_PROJECT_NAME,
  normalizeLibraryPipelineName,
} from '@/lib/libraryConstants';

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
  skipped: number;
}> {
  const project = await ensureLibraryProject(userId);

  const existing = await prisma.pipeline.findMany({
    where: { projectId: project.id },
    select: { id: true, name: true },
  });

  // Compared by normalized name so a pipeline seeded under older numbering is
  // recognised as the same workflow rather than duplicated.
  const byNormalized = new Map(
    existing.map((p) => [normalizeLibraryPipelineName(p.name), p])
  );

  let created = 0;
  let renamed = 0;

  for (const template of LIBRARY_PIPELINES) {
    const match = byNormalized.get(normalizeLibraryPipelineName(template.name));

    if (!match) {
      await createPipelineFromTemplate(project.id, template);
      created++;
      continue;
    }

    // Same workflow under an old label — align the name only. Nodes, edges and
    // any customisation the user made are left untouched.
    if (match.name.trim() !== template.name) {
      await prisma.pipeline.update({
        where: { id: match.id },
        data: { name: template.name },
      });
      renamed++;
    }
  }

  return {
    projectId: project.id,
    created,
    renamed,
    skipped: LIBRARY_PIPELINES.length - created - renamed,
  };
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

async function createPipelineFromTemplate(
  projectId: string,
  template: LibraryPipelineTemplate
): Promise<void> {
  // Node ids are generated per copy; template edges reference nodes by index.
  const nodeIds = template.nodes.map(
    (n, i) => `node_${n.type}_${i}_${Math.random().toString(36).slice(2, 9)}`
  );

  await prisma.pipeline.create({
    data: {
      projectId,
      name: template.name,
      description: template.description,
      nodes: {
        create: template.nodes.map((n, i) => ({
          id: nodeIds[i],
          type: n.type,
          label: n.label,
          positionX: n.x,
          positionY: n.y,
          config: n.config,
        })),
      },
      edges: {
        create: template.edges.map((e) => ({
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
