import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const pipelines = await prisma.pipeline.findMany({ select: { id: true, name: true } });
  console.log(pipelines);
}
main().finally(() => prisma.$disconnect());
