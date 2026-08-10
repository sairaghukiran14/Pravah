import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany();
  
  if (projects.length === 0) {
    console.log("No projects found in the database!");
    return;
  }

  console.log(`Found ${projects.length} projects. Adding Advanced Document Vision Pipeline to all of them...`);

  for (const project of projects) {
    // Check if the pipeline already exists to avoid duplicates
    const existing = await prisma.pipeline.findFirst({
      where: { projectId: project.id, name: 'Advanced Document Vision & Audio Alert' }
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
        name: 'Advanced Document Vision & Audio Alert',
        description: 'Digitises uploaded PDFs or invoice images, translates the extracted metadata, and synthesizes audio alerts for localized records.',
      }
    });

    const nodes = [
      { id: 'node_doc_in', type: 'document_input', label: 'Upload Document / Invoice', x: 80, y: 250, config: { format: 'pdf' } },
      { id: 'node_vision', type: 'vision', label: 'Document AI & Prompt Analysis', x: 340, y: 250, config: { prompt: 'Extract key invoice details including vendor name, total amount, and items list.', language: 'en-IN' } },
      { id: 'node_translate', type: 'translate', label: 'Translate to Telugu', x: 600, y: 250, config: { source_language_code: 'auto', target_language_code: 'te-IN', mode: 'formal' } },
      { id: 'node_text_out', type: 'text_output', label: 'Translated Metadata', x: 860, y: 150, config: {} },
      { id: 'node_tts', type: 'tts', label: 'Synthesize Voice Alert', x: 860, y: 350, config: { target_language_code: 'te-IN', speaker: 'ritu', pace: 1.0, model: 'bulbul:v3' } },
      { id: 'node_audio_out', type: 'audio_output', label: 'Play Audio Alert', x: 1120, y: 350, config: {} }
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
      { source: 'node_doc_in', target: 'node_vision' },
      { source: 'node_vision', target: 'node_translate' },
      { source: 'node_translate', target: 'node_text_out' },
      { source: 'node_translate', target: 'node_tts' },
      { source: 'node_tts', target: 'node_audio_out' }
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
    console.log(`Successfully created Advanced Document Vision Pipeline (ID: ${pipelineId}) for project ${project.id}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
