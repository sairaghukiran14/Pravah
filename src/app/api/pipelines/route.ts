import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, projectId } = body;

    if (!name || !projectId) {
      return NextResponse.json(
        { error: 'Name and projectId are required' },
        { status: 400 }
      );
    }

    // Verify project belongs to user
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 403 });
    }

    // Default template nodes for new pipeline
    const initialNodes = [
      {
        id: `node_stt_${Math.random().toString(36).substring(7)}`,
        type: 'stt',
        label: 'Speech to Text',
        positionX: 100,
        positionY: 200,
        config: { language_code: 'hi-IN', model: 'saaras:v3', mode: 'transcribe' },
      },
      {
        id: `node_tr_${Math.random().toString(36).substring(7)}`,
        type: 'translate',
        label: 'Translate',
        positionX: 450,
        positionY: 200,
        config: { source_language_code: 'auto', target_language_code: 'te-IN', mode: 'formal' },
      },
      {
        id: `node_tts_${Math.random().toString(36).substring(7)}`,
        type: 'tts',
        label: 'Text to Speech',
        positionX: 800,
        positionY: 200,
        config: { target_language_code: 'te-IN', speaker: 'ritu', pace: 1.0, model: 'bulbul:v3' },
      },
    ];

    const initialEdges = [
      {
        id: `edge_1`,
        source: initialNodes[0].id,
        target: initialNodes[1].id,
      },
      {
        id: `edge_2`,
        source: initialNodes[1].id,
        target: initialNodes[2].id,
      },
    ];

    const pipeline = await prisma.pipeline.create({
      data: {
        name,
        description,
        projectId,
        nodes: {
          create: initialNodes,
        },
        edges: {
          create: initialEdges,
        },
      },
      include: {
        nodes: true,
        edges: true,
      },
    });

    return NextResponse.json(pipeline, { status: 201 });
  } catch (error: any) {
    console.error('Prisma create pipeline error:', error);
    return NextResponse.json(
      { error: 'Failed to create pipeline' },
      { status: 500 }
    );
  }
}
