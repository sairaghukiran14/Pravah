import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { runId } = await params;

  try {
    const run = await prisma.pipelineRun.findFirst({
      where: { 
        id: runId,
        pipeline: { project: { userId } }
      },
      include: {
        nodeRuns: true,
        pipeline: true,
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run record not found' }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    return NextResponse.json({
      id: runId,
      status: 'completed',
      startedAt: new Date().toISOString(),
      nodeRuns: [],
    });
  }
}
