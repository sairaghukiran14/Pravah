import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { notFound, badRequest } from '@/lib/api/errors';
import { PIPELINE_TEMPLATES, createGraphFromTemplate } from '@/lib/templates';

type Params = { id: string };

/**
 * POST /api/templates/:id/clone
 * Clones a public template into the user's project, creating all nodes & edges,
 * and returns the new pipeline ID for instant redirection.
 */
export const POST = route<undefined, undefined, Params>(
  { auth: true },
  async ({ userId, params }) => {
    const templateId = params.id;
    const template = PIPELINE_TEMPLATES.find((t) => t.id === templateId);

    if (!template) {
      throw notFound(`Template "${templateId}" not found`);
    }

    // Find the user's latest project, or create a default project if none exists
    let project = await prisma.project.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          name: 'My Workflows',
          description: 'Default workspace for AI pipelines',
          userId,
        },
        select: { id: true, name: true },
      });
    }

    const { nodes: layoutNodes, edges: layoutEdges } = createGraphFromTemplate(template);

    // Create the pipeline in the database
    const pipeline = await prisma.pipeline.create({
      data: {
        name: template.name,
        description: template.description,
        projectId: project.id,
        nodes: {
          create: layoutNodes.map((n) => ({
            id: n.id,
            type: n.type as string,
            label: (n.data?.label as string) || n.type || '',
            positionX: n.position.x,
            positionY: n.position.y,
            config: (n.data?.config as any) || {},
          })),
        },
        edges: {
          create: layoutEdges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle || null,
            targetHandle: e.targetHandle || null,
          })),
        },
      },
      select: { id: true, name: true, projectId: true },
    });

    return {
      success: true,
      pipelineId: pipeline.id,
      projectId: pipeline.projectId,
      message: `Template "${template.name}" cloned successfully!`,
    };
  }
);
