import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: pipelineId } = await params;

  try {
    // Verify pipeline belongs to the user
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: pipelineId, project: { userId } }
    });

    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found or unauthorized' }, { status: 403 });
    }

    const runs = await prisma.pipelineRun.findMany({
      where: { pipelineId },
      include: {
        nodeRuns: true,
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(runs);
  } catch (error: any) {
    console.error('Prisma run history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline runs' },
      { status: 500 }
    );
  }
}
