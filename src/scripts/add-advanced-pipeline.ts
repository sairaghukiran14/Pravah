import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany();
  
  if (projects.length === 0) {
    console.log("No projects found in the database!");
    return;
  }

  console.log(`Found ${projects.length} projects. Adding Advanced Call Analytics Pipeline to all of them...`);

  for (const project of projects) {
    // Check if the pipeline already exists to avoid duplicates
    const existing = await prisma.pipeline.findFirst({
      where: { projectId: project.id, name: 'Advanced Call Center Analytics' }
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
        name: 'Advanced Call Center Analytics',
        description: 'Transcribes customer audio calls, detects sentiment, translates context, summarizes transcripts, and synthesizes Telugu voice alerts.',
      }
    });

    const nodes = [
      { id: 'node_audio_in', type: 'audio_input', label: 'Call Recording Upload', x: 80, y: 250, config: { input_type: 'upload' } },
      { id: 'node_stt', type: 'stt', label: 'Transcribe Customer Call', x: 340, y: 250, config: { language_code: 'hi-IN', model: 'saaras:v3', mode: 'transcribe' } },
      { id: 'node_sentiment', type: 'sentiment', label: 'Detect Sentiment', x: 600, y: 100, config: { format: 'json' } },
      { id: 'node_summarize', type: 'summarize', label: 'Generate Summary', x: 600, y: 250, config: { length: 'short' } },
      { id: 'node_translate', type: 'translate', label: 'Translate to Telugu', x: 600, y: 400, config: { source_language_code: 'auto', target_language_code: 'te-IN', mode: 'formal' } },
      { id: 'node_sentiment_out', type: 'text_output', label: 'Sentiment Label', x: 860, y: 100, config: {} },
      { id: 'node_summary_out', type: 'text_output', label: 'Summary Display', x: 860, y: 250, config: {} },
      { id: 'node_tts', type: 'tts', label: 'Synthesize Voice Alert', x: 860, y: 400, config: { target_language_code: 'te-IN', speaker: 'ritu', pace: 1.0, model: 'bulbul:v3' } },
      { id: 'node_audio_out', type: 'audio_output', label: 'Play Voice Response', x: 1120, y: 400, config: {} }
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
      { source: 'node_audio_in', target: 'node_stt' },
      { source: 'node_stt', target: 'node_sentiment' },
      { source: 'node_stt', target: 'node_summarize' },
      { source: 'node_stt', target: 'node_translate' },
      { source: 'node_sentiment', target: 'node_sentiment_out' },
      { source: 'node_summarize', target: 'node_summary_out' },
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
    console.log(`Successfully created Advanced Call Center Analytics Pipeline (ID: ${pipelineId}) for project ${project.id}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
