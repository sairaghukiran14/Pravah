import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany();
  
  if (projects.length === 0) {
    console.log("No projects found in the database!");
    return;
  }

  console.log(`Found ${projects.length} projects. Adding pipeline to all of them...`);

  for (const project of projects) {
    // Check if the pipeline already exists to avoid duplicates
    const existing = await prisma.pipeline.findFirst({
      where: { projectId: project.id, name: 'Document Vision & OCR Pipeline' }
    });

    if (existing) {
      console.log(`Pipeline already exists in project ${project.id}. Skipping.`);
      continue;
    }
    
    const pipelineId = crypto.randomUUID();
    await prisma.pipeline.create({
      data: {
        id: pipelineId,
        projectId: project.id,
        name: 'Document Vision & OCR Pipeline',
        description: 'Extract text from documents and analyze visually with Vision AI.',
      }
    });

    const nodes = [
      { type: 'document_input', label: 'Document Upload', x: 100, y: 200, config: { format: 'pdf' } },
      { type: 'ocr', label: 'Extract Text (OCR)', x: 400, y: 100, config: {} },
      { type: 'vision', label: 'Vision Analysis', x: 400, y: 300, config: { prompt: 'Extract key insights from this document.' } },
      { type: 'text_output', label: 'OCR Results', x: 700, y: 100, config: {} },
      { type: 'text_output', label: 'Vision Insights', x: 700, y: 300, config: {} }
    ];

    const nodeIds: string[] = [];
    const nodeCreates = nodes.map((n) => {
      const nodeId = crypto.randomUUID();
      nodeIds.push(nodeId);
      return {
        id: nodeId,
        pipelineId: pipelineId,
        type: n.type,
        label: n.label,
        positionX: n.x,
        positionY: n.y,
        config: n.config,
      };
    });
    
    await prisma.pipelineNode.createMany({ data: nodeCreates });

    const edges = [
      { source: 0, target: 1 },
      { source: 0, target: 2 },
      { source: 1, target: 3 },
      { source: 2, target: 4 }
    ];

    const edgeCreates = edges.map((e) => ({
      id: crypto.randomUUID(),
      pipelineId: pipelineId,
      source: nodeIds[e.source],
      target: nodeIds[e.target],
      sourceHandle: 'output',
      targetHandle: 'input'
    }));

    await prisma.pipelineEdge.createMany({ data: edgeCreates });
    console.log(`Successfully created Document Vision & OCR Pipeline (ID: ${pipelineId}) for project ${project.id}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
