import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sortNodesTopologically, executeSingleNode } from '@/lib/execution';
import { SerializedNode, SerializedEdge } from '@/types/pipeline';
import { auth } from '@/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Pre-execution insufficient credits check
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true }
  });

  if (!user || user.credits <= 0) {
    return new Response(
      JSON.stringify({ error: 'Insufficient credits. Please top up your wallet.' }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { id: pipelineId } = await params;

  const initialInputText = 'नमस्ते! भारत की कृत्रिम बुद्धिमत्ता सर्वम एआई।';
  const initialInputs: Record<string, any> = {};
  
  // Fetch pipeline structure
  let pipelineData: { nodes: SerializedNode[]; edges: SerializedEdge[] } = {
    nodes: [],
    edges: [],
  };

  try {
    const body = await req.json();
    if (body.inputs) {
      Object.assign(initialInputs, body.inputs);
    }
    if (body.nodes && Array.isArray(body.nodes) && body.nodes.length > 0) {
      pipelineData.nodes = body.nodes.map((n: any) => ({
        id: n.id,
        type: n.type || n.data?.type,
        label: n.label || n.data?.label || n.type,
        positionX: n.positionX || n.position?.x || 0,
        positionY: n.positionY || n.position?.y || 0,
        config: n.config || n.data?.config || {},
      }));
    }
    if (body.edges && Array.isArray(body.edges)) {
      pipelineData.edges = body.edges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null,
      }));
    }
  } catch (e) {
    // optional body
  }

  // Only fetch from DB if the client did NOT send live nodes
  if (pipelineData.nodes.length === 0) {
    try {
      const dbPipeline = await prisma.pipeline.findFirst({
        where: { 
          id: pipelineId,
          project: { userId }
        },
        include: { nodes: true, edges: true },
      });

      if (!dbPipeline) {
        return new Response(JSON.stringify({ error: 'Pipeline not found or unauthorized' }), { status: 403 });
      }

      if (dbPipeline.nodes.length > 0) {
        pipelineData = {
          nodes: dbPipeline.nodes.map((n) => ({
            id: n.id,
            type: n.type as any,
            label: n.label,
            positionX: n.positionX,
            positionY: n.positionY,
            config: (n.config as any) || {},
          })),
          edges: dbPipeline.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })),
        };
      }
    } catch (e) {
      console.warn('Prisma run fetch error:', e);
    }
  } else {
    // Verify pipeline ownership even when using client-provided nodes
    try {
      const dbPipeline = await prisma.pipeline.findFirst({
        where: { id: pipelineId, project: { userId } },
        select: { id: true },
      });
      if (!dbPipeline) {
        return new Response(JSON.stringify({ error: 'Pipeline not found or unauthorized' }), { status: 403 });
      }
    } catch (e) {
      console.warn('Prisma ownership check error:', e);
    }
  }

  // Create real-time Server-Sent Events response stream
  const responseStream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(payload));
      };

      const nodes = pipelineData.nodes;
      const edges = pipelineData.edges;

      if (nodes.length === 0) {
        sendEvent('error', { message: 'Pipeline contains no nodes to execute.' });
        controller.close();
        return;
      }

      // Create Run Record in DB if available
      let runId = `run_${Math.random().toString(36).substring(7)}`;
      try {
        const dbRun = await prisma.pipelineRun.create({
          data: {
            pipelineId,
            status: 'running',
            input: { text: initialInputText },
            nodeRuns: {
              create: nodes.map((n) => ({
                nodeId: n.id,
                nodeType: n.type,
                status: 'pending',
              })),
            },
          },
        });
        runId = dbRun.id;
      } catch (e) {
        console.warn('DB run creation skipped:', e);
      }

      sendEvent('run_started', {
        runId,
        pipelineId,
        nodeCount: nodes.length,
        initialInputText,
      });

      // Topological Sort to execute in exact DAG dependency order
      const sortedNodes = sortNodesTopologically(nodes, edges);
      const nodeOutputs: Record<string, any> = {};
      let isPipelineFailed = false;
      let totalCost = 0;

      for (const node of sortedNodes) {
        if (isPipelineFailed) {
          sendEvent('node_skipped', { nodeId: node.id, reason: 'Upstream node failed' });
          continue;
        }

        // Notify client node execution started
        sendEvent('node_started', {
          nodeId: node.id,
          nodeType: node.type,
          label: node.label,
        });

        // Update DB node run status to running
        try {
          await prisma.nodeRun.updateMany({
            where: { runId, nodeId: node.id },
            data: { status: 'running', startedAt: new Date() },
          });
        } catch (e) {}

        // Execute node step
        const result = await executeSingleNode(node, edges, nodeOutputs, initialInputText, initialInputs);

        if (result.status === 'completed') {
          nodeOutputs[node.id] = result.output;

          // Calculate node execution cost
          let nodeCost = 0;
          if (node.type === 'stt') {
            nodeCost = 0.375; // Baseline ₹0.375 (30s)
          } else if (node.type === 'translate') {
            const charCount = (result.input?.text || '').length;
            nodeCost = charCount * 0.003; // ₹3.00 per 1,000 characters
          } else if (node.type === 'tts') {
            const charCount = (result.input?.text || '').length;
            nodeCost = charCount * 0.00225; // ₹2.25 per 1,000 characters
          } else if (node.type !== 'audio_input' && node.type !== 'audio_output' && node.type !== 'text_input' && node.type !== 'text_output') {
            nodeCost = 0.50; // flat rate for other AI processing nodes
          }
          totalCost += nodeCost;

          // Update DB node run
          try {
            await prisma.nodeRun.updateMany({
              where: { runId, nodeId: node.id },
              data: {
                status: 'completed',
                input: result.input,
                output: result.output,
                finishedAt: new Date(),
              },
            });
          } catch (e) {}

          sendEvent('node_completed', {
            nodeId: node.id,
            nodeType: node.type,
            output: result.output,
            durationMs: result.durationMs,
          });
        } else {
          isPipelineFailed = true;

          try {
            await prisma.nodeRun.updateMany({
              where: { runId, nodeId: node.id },
              data: {
                status: 'failed',
                error: result.error,
                finishedAt: new Date(),
              },
            });
          } catch (e) {}

          sendEvent('node_failed', {
            nodeId: node.id,
            error: result.error,
          });
        }
      }

      // Finalize Run record and deduct wallet balance
      const finalStatus = isPipelineFailed ? 'failed' : 'completed';
      try {
        await prisma.$transaction(async (tx) => {
          // Deduct credits if cost accumulated
          if (totalCost > 0) {
            await tx.user.update({
              where: { id: userId },
              data: {
                credits: { decrement: totalCost }
              }
            });

            // Log Transaction
            await tx.creditTransaction.create({
              data: {
                userId,
                amount: -totalCost,
                type: 'deduction',
                description: `Pipeline run execution cost (Run ID: ${runId.substring(0, 8)})`
              }
            });
          }

          // Update Run status
          await tx.pipelineRun.update({
            where: { id: runId },
            data: { status: finalStatus, finishedAt: new Date() },
          });
        });
      } catch (e) {
        console.warn('DB run finalization failed:', e);
      }

      sendEvent('run_completed', {
        runId,
        status: finalStatus,
        outputs: nodeOutputs,
      });

      controller.close();
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
