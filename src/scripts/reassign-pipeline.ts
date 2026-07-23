import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userName = 'sai raghu kiran avula';
  const pipelineId = 'pipeline_6xhjyq';

  console.log(`Looking for user containing: "${userName}"`);
  
  // Find the user
  const users = await prisma.user.findMany({
    where: {
      name: {
        contains: 'sai raghu',
        mode: 'insensitive'
      }
    }
  });

  if (users.length === 0) {
    console.error('User not found!');
    return;
  }

  const user = users[0];
  console.log(`Found user: ${user.name} (${user.id})`);

  // Find a project for this user
  let project = await prisma.project.findFirst({
    where: { userId: user.id }
  });

  if (!project) {
    console.log('No project found for user. Creating a default project...');
    project = await prisma.project.create({
      data: {
        name: 'My Pipelines',
        userId: user.id,
      }
    });
  }

  console.log(`Assigning pipeline to project: ${project.name} (${project.id})`);

  // Check if pipeline exists
  const existingPipeline = await prisma.pipeline.findUnique({
    where: { id: pipelineId }
  });

  if (!existingPipeline) {
    console.error(`Pipeline ${pipelineId} does not exist in DB!`);
    return;
  }

  // Update pipeline
  const updated = await prisma.pipeline.update({
    where: { id: pipelineId },
    data: { projectId: project.id }
  });

  console.log(`✅ Successfully reassigned pipeline ${pipelineId} to user ${user.name}!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
