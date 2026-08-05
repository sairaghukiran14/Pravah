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

    // New pipelines start with an empty canvas
    const initialNodes: any[] = [];
    const initialEdges: any[] = [];

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
