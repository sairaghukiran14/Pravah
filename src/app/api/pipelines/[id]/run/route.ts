import { z } from 'zod';
import prisma from '@/lib/prisma';
import { sortNodesTopologically, executeSingleNode } from '@/lib/execution';
import { SerializedNode, SerializedEdge } from '@/types/pipeline';
import { route } from '@/lib/api/route';
import { forbidden, paymentRequired, tooManyRequests, badRequest } from '@/lib/api/errors';
import {
  reserveCredits,
  settleCredits,
  releaseReservation,
  countActiveRuns,
  RUN_RESERVATION,
  MAX_CONCURRENT_RUNS,
} from '@/lib/api/credits';

type Params = { id: string };

const nodeSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  label: z.string().optional(),
  positionX: z.coerce.number().optional(),
  positionY: z.coerce.number().optional(),
  position: z.object({ x: z.coerce.number(), y: z.coerce.number() }).partial().optional(),
  config: z.record(z.string(), z.any()).optional(),
  data: z.record(z.string(), z.any()).optional(),
});

const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
});

const bodySchema = z
  .object({
    inputs: z.record(z.string(), z.any()).optional(),
    nodes: z.array(nodeSchema).max(500).optional(),
    edges: z.array(edgeSchema).max(1000).optional(),
  })
  .default({});

const INITIAL_INPUT_TEXT = 'नमस्ते! भारत की कृत्रिम बुद्धिमत्ता सर्वम एआई।';

export const POST = route<z.infer<typeof bodySchema>, undefined, Params>(
  // cost 25: a single run can fan out into many paid Sarvam calls.
  { cost: 25, body: bodySchema },
  async ({ userId, params, body }) => {
    const pipelineId = params.id;

    // Ownership is checked before any credit is held.
    const owned = await prisma.pipeline.findFirst({
      where: { id: pipelineId, project: { userId } },
      select: { id: true },
    });
    if (!owned) throw forbidden('Pipeline not found or unauthorized');

    if ((await countActiveRuns(userId)) >= MAX_CONCURRENT_RUNS) {
      throw tooManyRequests(
        `You already have ${MAX_CONCURRENT_RUNS} runs in progress. Wait for one to finish before starting another.`
      );
    }

    // Hold credit up front. If this fails the user cannot afford the run and no
    // paid API call is made.
    const reserved = RUN_RESERVATION;
    if (!(await reserveCredits(userId, reserved))) {
      throw paymentRequired('Insufficient credits. Please top up your wallet.');
    }

    try {
      const pipelineData = await resolvePipelineData(pipelineId, userId, body);

      if (pipelineData.nodes.length === 0) {
        await releaseReservation(userId, reserved);
        throw badRequest('Pipeline contains no nodes to execute.');
      }

      return streamRun({ pipelineId, userId, reserved, pipelineData, inputs: body.inputs || {} });
    } catch (error) {
      // Any failure before the stream starts must return the held credit.
      await releaseReservation(userId, reserved);
      throw error;
    }
  }
);

async function resolvePipelineData(
  pipelineId: string,
  userId: string,
  body: z.infer<typeof bodySchema>
): Promise<{ nodes: SerializedNode[]; edges: SerializedEdge[] }> {
  // Client-supplied graph (unsaved editor state) — ownership already verified.
  if (body.nodes?.length) {
    return {
      nodes: body.nodes.map((n) => ({
        id: n.id,
        type: (n.type || (n.data?.type as string)) as any,
        label: n.label || (n.data?.label as string) || n.type || '',
        positionX: Number(n.positionX ?? n.position?.x ?? 0),
        positionY: Number(n.positionY ?? n.position?.y ?? 0),
        config: (n.config || n.data?.config || {}) as any,
      })),
      edges: (body.edges || []).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null,
      })),
    };
  }

  const dbPipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, project: { userId } },
    include: { nodes: true, edges: true },
  });

  if (!dbPipeline) throw forbidden('Pipeline not found or unauthorized');

  return {
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

/**
 * The text a node actually processed, used to meter per-character pricing.
 *
 * executeSingleNode records `{ text }` for entry nodes but `{ payload }` when
 * the input came from an upstream node — and payload may be a string or the
 * previous node's output object. Reading only `.text` silently yielded an empty
 * string for any node with an incoming edge, which is the normal case, so
 * translate and TTS were billed as zero.
 */
function billableText(input: any): string {
  if (!input) return '';
  if (typeof input.text === 'string') return input.text;

  const payload = input.payload;
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object') {
    return (
      payload.translated_text ||
      payload.transcript ||
      payload.response ||
      payload.text ||
      ''
    );
  }
  return '';
}

function nodeCost(nodeType: string, input: any): number {
  if (nodeType === 'stt') return 0.375; // baseline 30s of audio
  if (nodeType === 'translate') return billableText(input).length * 0.003; // ₹3.00 / 1k chars
  if (nodeType === 'tts') return billableText(input).length * 0.00225; // ₹2.25 / 1k chars
  const free = ['audio_input', 'audio_output', 'text_input', 'text_output'];
  return free.includes(nodeType) ? 0 : 0.5;
}

function streamRun({
  pipelineId,
  userId,
  reserved,
  pipelineData,
  inputs,
}: {
  pipelineId: string;
  userId: string;
  reserved: number;
  pipelineData: { nodes: SerializedNode[]; edges: SerializedEdge[] };
  inputs: Record<string, any>;
}): Response {
  const responseStream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(
          new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const { nodes, edges } = pipelineData;
      let runId = '';
      let totalCost = 0;

      try {
        const dbRun = await prisma.pipelineRun.create({
          data: {
            pipelineId,
            status: 'running',
            input: { text: INITIAL_INPUT_TEXT },
            nodeRuns: {
              create: nodes.map((n) => ({ nodeId: n.id, nodeType: n.type, status: 'pending' })),
            },
          },
        });
        runId = dbRun.id;

        sendEvent('run_started', {
          runId,
          pipelineId,
          nodeCount: nodes.length,
          initialInputText: INITIAL_INPUT_TEXT,
        });

        const sortedNodes = sortNodesTopologically(nodes, edges);
        const nodeOutputs: Record<string, any> = {};
        const skippedNodes = new Set<string>();
        let isPipelineFailed = false;

        for (const node of sortedNodes) {
          if (isPipelineFailed) {
            sendEvent('node_skipped', { nodeId: node.id, reason: 'Upstream node failed' });
            continue;
          }

          if (skippedNodes.has(node.id)) {
            edges.filter((e) => e.source === node.id).forEach((e) => skippedNodes.add(e.target));
            await prisma.nodeRun
              .updateMany({
                where: { runId, nodeId: node.id },
                data: {
                  status: 'failed',
                  error: 'Skipped by conditional router',
                  finishedAt: new Date(),
                },
              })
              .catch(() => {});
            sendEvent('node_skipped', { nodeId: node.id, reason: 'Skipped by conditional router' });
            continue;
          }

          sendEvent('node_started', { nodeId: node.id, nodeType: node.type, label: node.label });

          await prisma.nodeRun
            .updateMany({
              where: { runId, nodeId: node.id },
              data: { status: 'running', startedAt: new Date() },
            })
            .catch(() => {});

          const result = await executeSingleNode(
            node,
            edges,
            nodeOutputs,
            INITIAL_INPUT_TEXT,
            inputs
          );

          if (result.status === 'completed') {
            nodeOutputs[node.id] = result.output;

            if (node.type === 'router' && result.output?.activeHandle) {
              edges
                .filter((e) => e.source === node.id)
                .forEach((e) => {
                  if (e.sourceHandle !== result.output.activeHandle) skippedNodes.add(e.target);
                });
            }

            totalCost += nodeCost(node.type, result.input);

            await prisma.nodeRun
              .updateMany({
                where: { runId, nodeId: node.id },
                data: {
                  status: 'completed',
                  input: result.input,
                  output: result.output,
                  finishedAt: new Date(),
                },
              })
              .catch(() => {});

            sendEvent('node_completed', {
              nodeId: node.id,
              nodeType: node.type,
              output: result.output,
              durationMs: result.durationMs,
            });
          } else {
            isPipelineFailed = true;
            await prisma.nodeRun
              .updateMany({
                where: { runId, nodeId: node.id },
                data: {
                  status: 'failed',
                  input: result.input || {},
                  error: result.error,
                  finishedAt: new Date(),
                },
              })
              .catch(() => {});
            sendEvent('node_failed', { nodeId: node.id, error: result.error });
          }
        }

        const finalStatus = isPipelineFailed ? 'failed' : 'completed';

        await prisma.pipelineRun
          .update({
            where: { id: runId },
            data: { status: finalStatus, finishedAt: new Date() },
          })
          .catch((e) => console.warn('Run status update failed:', e));

        sendEvent('run_completed', { runId, status: finalStatus, outputs: nodeOutputs });
      } catch (error: any) {
        console.error('[run] Execution failed:', error);
        sendEvent('error', { message: 'Pipeline execution failed.' });
        if (runId) {
          await prisma.pipelineRun
            .update({ where: { id: runId }, data: { status: 'failed', finishedAt: new Date() } })
            .catch(() => {});
        }
      } finally {
        // Always settle: refund the unused portion of the reservation, or take
        // the excess if the run cost more than was held.
        try {
          await settleCredits({
            userId,
            reserved,
            actualCost: Math.min(totalCost, reserved),
            runId: runId || 'unknown',
          });
        } catch (e) {
          console.error('[run] Credit settlement failed:', e);
        }
        controller.close();
      }
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
