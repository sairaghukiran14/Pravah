import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find a user and their first project, or create them
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Demo User',
        email: 'demo@example.com',
        onboardingCompleted: true,
      },
    });
    console.log('Created dummy user:', user.email);
  }

  let project = await prisma.project.findFirst({ where: { userId: user.id } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'My Demo Project',
        description: 'Auto-generated demo project',
        userId: user.id,
      },
    });
    console.log('Created project:', project.name);
  }

  const pipelineId = `pipeline_${Math.random().toString(36).substring(7)}`;

  const nodeTranslateHiId = `node_translate_hi_${Math.random().toString(36).substring(7)}`;
  const nodeTranslateTeId = `node_translate_te_${Math.random().toString(36).substring(7)}`;
  const nodeTtsHiId = `node_tts_hi_${Math.random().toString(36).substring(7)}`;
  const nodeTtsTeId = `node_tts_te_${Math.random().toString(36).substring(7)}`;

  // Create pipeline
  const pipeline = await prisma.pipeline.create({
    data: {
      id: pipelineId,
      name: 'Hindi & Telugu Audio Converter',
      description: 'Takes text input, splits it to translate to Hindi and Telugu, then synthesizes both languages into audio concurrently.',
      projectId: project.id,
      nodes: {
        create: [
          {
            id: nodeTranslateHiId,
            type: 'translate',
            label: 'Translate to Hindi',
            positionX: 200,
            positionY: 100,
            config: {
              source_language_code: 'auto',
              target_language_code: 'hi-IN',
              mode: 'formal',
            },
          },
          {
            id: nodeTtsHiId,
            type: 'tts',
            label: 'Hindi Audio (Meera)',
            positionX: 500,
            positionY: 100,
            config: {
              target_language_code: 'hi-IN',
              speaker: 'meera',
              pace: 1.0,
              model: 'bulbul:v3',
            },
          },
          {
            id: nodeTranslateTeId,
            type: 'translate',
            label: 'Translate to Telugu',
            positionX: 200,
            positionY: 300,
            config: {
              source_language_code: 'auto',
              target_language_code: 'te-IN',
              mode: 'formal',
            },
          },
          {
            id: nodeTtsTeId,
            type: 'tts',
            label: 'Telugu Audio (Meera)',
            positionX: 500,
            positionY: 300,
            config: {
              target_language_code: 'te-IN',
              speaker: 'meera',
              pace: 1.0,
              model: 'bulbul:v3',
            },
          },
        ],
      },
      edges: {
        create: [
          {
            source: nodeTranslateHiId,
            target: nodeTtsHiId,
          },
          {
            source: nodeTranslateTeId,
            target: nodeTtsTeId,
          },
        ],
      },
    },
  });

  console.log(`✅ Pipeline "${pipeline.name}" created successfully!`);
  console.log(`Open http://localhost:3000/pipeline/${pipeline.id} to view it.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
