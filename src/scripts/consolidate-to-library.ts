import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();

  for (const user of users) {
    let libraryProject = await prisma.project.findFirst({
      where: { userId: user.id, name: 'Library' }
    });

    if (!libraryProject) {
      libraryProject = await prisma.project.create({
        data: {
          userId: user.id,
          name: 'Library',
          description: 'A consolidated library of all quick access and advanced pipelines.',
        }
      });
      console.log(`Created new "Library" project for user ${user.id}`);
    }

    const sourceProjects = await prisma.project.findMany({
      where: {
        userId: user.id,
        name: { in: ['Sample Project', 'Advanced AI Use Cases'] }
      }
    });

    for (const oldProject of sourceProjects) {
      const updateResult = await prisma.pipeline.updateMany({
        where: { projectId: oldProject.id },
        data: { projectId: libraryProject.id }
      });
      
      console.log(`Moved ${updateResult.count} pipelines from "${oldProject.name}" to "Library".`);

      await prisma.project.delete({
        where: { id: oldProject.id }
      });
      console.log(`Deleted empty project: "${oldProject.name}"`);
    }
  }
}

main()
  .catch((e) => {
    console.error('Error consolidating to library:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
