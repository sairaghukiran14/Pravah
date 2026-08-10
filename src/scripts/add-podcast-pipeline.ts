import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany();
  
  if (projects.length === 0) {
    console.log("No projects found in the database!");
    return;
  }

  console.log(`Found ${projects.length} projects. Adding Podcast Generator Pipeline to all of them...`);

  for (const project of projects) {
    // Check if the pipeline already exists to avoid duplicates
    const existing = await prisma.pipeline.findFirst({
      where: { projectId: project.id, name: '2-Speaker Podcast Generator' }
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
        name: '2-Speaker Podcast Generator',
        description: 'Input a topic, generate a 2-speaker debate dialogue script, and synthesize the combined multi-speaker spoken podcast audio.',
      }
    });

    const nodes = [
      { id: 'node_text_in', type: 'text_input', label: 'Enter Podcast Topic', x: 80, y: 250, config: { default_text: 'Artificial Intelligence: Boon or Bane' } },
      { id: 'node_podcast', type: 'podcast', label: 'Podcast Script & Synthesis', x: 380, y: 250, config: { speaker_a: 'aditya', speaker_b: 'ritu', target_language_code: 'hi-IN', turns: 4 } },
      { id: 'node_text_out', type: 'text_output', label: 'Dialogue Transcript', x: 680, y: 150, config: {} },
      { id: 'node_audio_out', type: 'audio_output', label: 'Play Conversational Podcast', x: 680, y: 350, config: {} }
    ];

    const nodeUUIDs: Record<string, string> = {};
    const nodeCreates = nodes.map((n) => {
      const nodeUUID = crypto.randomUUID();
      nodeUUIDs[n.id] = nodeUUID;
      return {
        id: nodeUUID,
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
      { source: 'node_text_in', target: 'node_podcast' },
      { source: 'node_podcast', target: 'node_text_out' },
      { source: 'node_podcast', target: 'node_audio_out' }
    ];

    const edgeCreates = edges.map((e) => ({
      id: crypto.randomUUID(),
      pipelineId: pipelineId,
      source: nodeUUIDs[e.source],
      target: nodeUUIDs[e.target],
      sourceHandle: 'output',
      targetHandle: 'input'
    }));

    await prisma.pipelineEdge.createMany({ data: edgeCreates });
    console.log(`Successfully created Podcast Generator Pipeline (ID: ${pipelineId}) for project ${project.id}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
