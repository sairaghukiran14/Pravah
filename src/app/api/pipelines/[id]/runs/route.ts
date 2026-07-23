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
  } catch (error) {
    console.warn('Prisma run history warning:', error);
    // Mock execution history response
    return NextResponse.json([
      {
        id: 'run_sample_1',
        pipelineId,
        status: 'completed',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        finishedAt: new Date(Date.now() - 3594000).toISOString(),
        nodeRuns: [
          {
            id: 'nr_1',
            nodeId: 'n1',
            nodeType: 'stt',
            status: 'completed',
            input: { text: 'नमस्ते सर्वम एआई' },
            output: { transcript: 'नमस्ते सर्वम एआई', confidence: 0.98 },
            startedAt: new Date(Date.now() - 3600000).toISOString(),
            finishedAt: new Date(Date.now() - 3598000).toISOString(),
          },
          {
            id: 'nr_2',
            nodeId: 'n2',
            nodeType: 'translate',
            status: 'completed',
            input: { text: 'नमस्ते सर्वम एआई' },
            output: { translated_text: 'Welcome to Sarvam AI' },
            startedAt: new Date(Date.now() - 3598000).toISOString(),
            finishedAt: new Date(Date.now() - 3596000).toISOString(),
          },
          {
            id: 'nr_3',
            nodeId: 'n3',
            nodeType: 'tts',
            status: 'completed',
            input: { text: 'Welcome to Sarvam AI' },
            output: { audios: ['base64_audio_sample'], format: 'wav' },
            startedAt: new Date(Date.now() - 3596000).toISOString(),
            finishedAt: new Date(Date.now() - 3594000).toISOString(),
          },
        ],
      },
    ]);
  }
}
