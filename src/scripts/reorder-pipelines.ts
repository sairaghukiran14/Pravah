import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({
    include: { pipelines: true }
  });

  for (const project of projects) {
    const pipelines = project.pipelines;

    const orderedNames = [
      { key: 'Audio Transcription Pipeline', name: '1. Audio Transcription Pipeline' },
      { key: 'Text Translation Pipeline', name: '2. Text Translation Pipeline' },
      { key: 'Multilingual Text-to-Speech', name: '3. Multilingual Text-to-Speech' },
      { key: 'Voice-to-Voice Translation', name: '4. Voice-to-Voice Translation' },
      { key: 'Dual Audio Broadcast', name: '5. Dual Audio Broadcast (Branched)' },
      { key: '2-Speaker Podcast Generator', name: '6. 2-Speaker Podcast Generator' },
      { key: 'Advanced Document Vision & Audio Alert', name: '7. Advanced Document Vision & Audio Alert' },
      { key: 'Document Vision & OCR Pipeline', name: '8. Document Vision & OCR Pipeline' },
      { key: 'Advanced Call Center Analytics', name: '9. Advanced Call Center Analytics' },
      { key: 'Advanced Indic Language', name: '10. Advanced Indic Language & LLM Workspace' }
    ];

    for (const pipeline of pipelines) {
      let newName = '';

      for (const order of orderedNames) {
        const cleanName = pipeline.name.replace(/^[0-9]+\.\s*/, '');
        if (cleanName.includes(order.key) || pipeline.name.includes(order.key)) {
          newName = order.name;
          break;
        }
      }

      if (newName && newName !== pipeline.name) {
        await prisma.pipeline.update({
          where: { id: pipeline.id },
          data: { name: newName }
        });
        console.log(`Renamed: "${pipeline.name}" -> "${newName}"`);
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
