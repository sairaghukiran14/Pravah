import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pipelineId = 'cmsfnoacf000alhfqnclv3i5v';
  
  try {
    const deletedPipeline = await prisma.pipeline.delete({
      where: { id: pipelineId }
    });
    console.log(`Successfully deleted pipeline with ID: ${deletedPipeline.id}`);
  } catch (error) {
    console.error(`Failed to delete pipeline. It might not exist. Error:`, error);
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
