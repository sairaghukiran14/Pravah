import { z } from 'zod';
import prisma from '@/lib/prisma';
import { sortNodesTopologically, executeSingleNode, resolveNodeInput } from '@/lib/execution';
import { SerializedNode, SerializedEdge } from '@/types/pipeline';
import { route } from '@/lib/api/route';
import { nodeCost } from '@/lib/api/pricing';
import { classifyNodeError } from '@/lib/api/nodeErrors';
import { parseNodeConfig, type NodeConfigIssue } from '@/lib/api/nodeConfig';
import { recordAudit } from '@/lib/api/audit';
import { forbidden, paymentRequired, tooManyRequests, badRequest } from '@/lib/api/errors';
import {
  reserveCredits,
  settleCredits,
  releaseReservation,
  countActiveRuns,
  reapStaleRuns,
  creditsSpentToday,
  RUN_RESERVATION,
  MAX_CONCURRENT_RUNS,
  DAILY_CREDIT_CEILING,
} from '@/lib/api/credits';

type Params = { id: string };

/**
 * Without an explicit value this inherits the platform default, which is short
 * enough (10-15s on Vercel) that any pipeline doing real work is killed
 * mid-stream — and a killed process never reaches the settlement in `finally`.
 * 60s is the ceiling available on every plan; Pro deployments can raise it.
 */
export const maxDuration = 60;

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
  async ({ userId, params, body, req }) => {
    const pipelineId = params.id;

    // Ownership is checked before any credit is held.
    const owned = await prisma.pipeline.findFirst({
      where: { id: pipelineId, project: { userId } },
      select: { id: true },
    });
    if (!owned) throw forbidden('Pipeline not found or unauthorized');

    // Return any slots and credit held by runs whose process died before they
    // could settle themselves, so an earlier timeout does not lock the account.
    await reapStaleRuns(userId).catch((e) => console.warn('[run] Reaper failed:', e));

    // Blast-radius limit on a shared upstream key: the wallet caps what one
    // account can spend in total, this caps how fast, which is the part that
    // affects other tenants.
    const spentToday = await creditsSpentToday(userId);
    if (spentToday >= DAILY_CREDIT_CEILING) {
      throw tooManyRequests(
        `Daily limit reached — ${spentToday.toFixed(2)} of ${DAILY_CREDIT_CEILING} credits used in the last 24 hours. Runs resume as earlier usage ages out.`
      );
    }

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

      await recordAudit({
        userId,
        action: 'pipeline.run',
        targetType: 'pipeline',
        targetId: pipelineId,
        // Node count and types only. The inputs themselves are customer content
        // and have no business being copied into an audit table.
        metadata: {
          nodeCount: pipelineData.nodes.length,
          nodeTypes: [...new Set(pipelineData.nodes.map((n) => n.type))],
          unsavedGraph: Boolean(body.nodes?.length),
        },
        req,
      });

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
    // Config is validated per node type here rather than in the body schema,
    // because the type is only known after resolving it from `type` or `data`.
    const issues: NodeConfigIssue[] = [];
    const nodes = body.nodes.map((n) => {
      const type = (n.type || (n.data?.type as string) || '') as string;
      const parsed = parseNodeConfig(n.id, type, n.config || n.data?.config || {});
      if (!parsed.ok) issues.push(...parsed.issues);

      return {
        id: n.id,
        type: type as any,
        label: n.label || (n.data?.label as string) || n.type || '',
        positionX: Number(n.positionX ?? n.position?.x ?? 0),
        positionY: Number(n.positionY ?? n.position?.y ?? 0),
        config: (parsed.ok ? parsed.config : {}) as any,
      };
    });

    if (issues.length > 0) {
      throw badRequest(
        `Invalid configuration on ${issues.length} node field(s).`,
        issues.map((i) => ({ node: i.nodeId, type: i.nodeType, field: i.path, message: i.message }))
      );
    }

    return {
      nodes,
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
      let runId: string | null = null;
      let totalCost = 0;

      try {
        const dbRun = await prisma.pipelineRun.create({
          data: {
            pipelineId,
            status: 'running',
            input: { text: INITIAL_INPUT_TEXT },
            // Recorded so the reaper can return this exact hold if the process
            // is killed before it settles.
            reservedCredits: reserved,
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
        /** Nodes that produced no output, whether they failed or were skipped. */
        const unavailable = new Set<string>();
        /** Edges a router ruled out; the node they feed may still run via another input. */
        const deadEdges = new Set<string>();
        let anyFailed = false;
        let budgetExhausted = false;
        /** Credits per node type, so upstream consumption is attributable. */
        const costBreakdown: Record<string, number> = {};

        const activeRunId = dbRun.id;
        const markSkipped = async (nodeId: string, reason: string) => {
          unavailable.add(nodeId);
          await prisma.nodeRun
            .updateMany({
              where: { runId: activeRunId, nodeId },
              data: { status: 'skipped', error: reason, finishedAt: new Date() },
            })
            .catch(() => {});
          sendEvent('node_skipped', { nodeId, reason });
        };

        for (const node of sortedNodes) {
          if (budgetExhausted) {
            await markSkipped(node.id, 'Run budget exhausted before this node could execute');
            continue;
          }

          const incoming = edges.filter((e) => e.target === node.id);
          const liveIncoming = incoming.filter(
            (e) => !deadEdges.has(e.id) && !unavailable.has(e.source)
          );

          // A node runs while at least one input is still live, so a failure or
          // a pruned branch only stops the paths that actually depended on it.
          // Entry nodes have no incoming edges and are never blocked here.
          if (incoming.length > 0 && liveIncoming.length === 0) {
            await markSkipped(
              node.id,
              incoming.some((e) => deadEdges.has(e.id))
                ? 'Skipped by conditional router'
                : 'No upstream node produced an input for this node'
            );
            continue;
          }

          // Price the node from the input it is about to receive, before doing
          // the work. Translate and TTS charge per character, so a single large
          // node checked only afterwards could overshoot the hold and settle the
          // wallet below zero.
          const projectedInput = resolveNodeInput(
            node,
            liveIncoming,
            nodeOutputs,
            INITIAL_INPUT_TEXT,
            inputs
          );
          const projectedCost = nodeCost(
            node.type,
            projectedInput.dynamicInputPayload
              ? { payload: projectedInput.dynamicInputPayload }
              : { text: projectedInput.upstreamInputText },
            // No usage yet — the node has not run. Rates that read usage project
            // from configuration instead, deliberately high enough that the
            // settlement below cannot exceed what was held here.
            { config: node.config }
          );

          if (totalCost + projectedCost > reserved) {
            budgetExhausted = true;
            await markSkipped(
              node.id,
              `Run budget exhausted — this node needs ${projectedCost.toFixed(2)} credit and only ${(
                reserved - totalCost
              ).toFixed(2)} remains`
            );
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
            // Only this node's live edges, so it reads its input from a source
            // that actually ran rather than from a pruned or failed one. Entry
            // nodes have none, which is the empty-input path already handled.
            liveIncoming,
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
                  if (e.sourceHandle !== result.output.activeHandle) deadEdges.add(e.id);
                });
            }

            const spent = nodeCost(node.type, result.input, {
              usage: result.usage,
              config: node.config,
            });
            totalCost += spent;
            costBreakdown[node.type] = (costBreakdown[node.type] ?? 0) + spent;

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
            anyFailed = true;
            // Only the paths fed by this node stop; independent branches carry on.
            unavailable.add(node.id);
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
            // Classified here rather than in the UI so the wording is decided
            // once, and so the raw provider message never has to be re-parsed
            // with substring checks on the client.
            sendEvent('node_failed', {
              nodeId: node.id,
              nodeType: node.type,
              label: node.label || node.type,
              error: result.error,
              failure: classifyNodeError(result.error, node.type),
            });
          }
        }

        const finalStatus = anyFailed || budgetExhausted ? 'failed' : 'completed';

        await prisma.pipelineRun
          .update({
            where: { id: dbRun.id },
            data: { status: finalStatus, finishedAt: new Date(), costBreakdown },
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
        // Always settle. The cost charged is what the run actually incurred —
        // capping it at the reservation silently absorbed the excess on exactly
        // the largest pipelines. Execution halts once the hold is spent, so the
        // overshoot is bounded by a single node.
        try {
          await settleCredits({ userId, reserved, actualCost: totalCost, runId });
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
