import prisma from '@/lib/prisma';
import { deleteFromR2 } from '@/lib/r2';

/**
 * Data retention.
 *
 * Run history holds the actual content a pipeline processed — transcripts of
 * customer calls, the text of uploaded documents, synthesised audio. Keeping it
 * forever is a liability that grows on its own, so it expires.
 *
 * Two windows, because the two kinds of data answer different questions:
 *
 *  - Run data (90 days). Inputs, outputs and the stored audio they reference.
 *    This is the customer's content.
 *  - Audit metadata (365 days). Who did what, and from where. No document,
 *    transcript or audio content, and it is what an incident investigation
 *    needs — which is usually discovered long after the fact.
 *
 * Objects in storage are removed alongside the rows that reference them.
 * Deleting only the rows would leave the bytes in the bucket: unreachable
 * through the app, but not gone.
 */

export const RUN_RETENTION_DAYS = Number(process.env.RUN_RETENTION_DAYS || 90);
export const AUDIT_RETENTION_DAYS = Number(process.env.AUDIT_RETENTION_DAYS || 365);

function cutoff(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export interface PurgeResult {
  runsDeleted: number;
  nodeRunsDeleted: number;
  auditDeleted: number;
  objectsDeleted: number;
  objectsFailed: { key: string; reason: string }[];
}

/**
 * Collects the storage keys a set of runs points at.
 *
 * Generated audio is recorded on the node run as `audio_r2_key`; uploads
 * arrive as an envelope carrying `r2_key`. Both have to go.
 */
export function objectKeysFrom(nodeRuns: { input: unknown; output: unknown }[]): string[] {
  const keys: string[] = [];

  const walk = (value: unknown, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 4) return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if ((key === 'audio_r2_key' || key === 'r2_key') && typeof child === 'string') {
        keys.push(child);
      } else if (child && typeof child === 'object') {
        walk(child, depth + 1);
      }
    }
  };

  for (const run of nodeRuns) {
    walk(run.output);
    walk(run.input);
  }

  return keys;
}

/**
 * Applies the retention policy across every account.
 *
 * `dryRun` reports what would go without touching anything, which is how this
 * should be checked before it is ever scheduled.
 */
export async function purgeExpiredData(dryRun = true): Promise<PurgeResult> {
  const runCutoff = cutoff(RUN_RETENTION_DAYS);
  const auditCutoff = cutoff(AUDIT_RETENTION_DAYS);

  const expiredRuns = await prisma.pipelineRun.findMany({
    where: { startedAt: { lt: runCutoff } },
    select: { id: true, nodeRuns: { select: { input: true, output: true } } },
  });

  const runIds = expiredRuns.map((r) => r.id);
  const keys = objectKeysFrom(expiredRuns.flatMap((r) => r.nodeRuns));
  const nodeRunCount = expiredRuns.reduce((n, r) => n + r.nodeRuns.length, 0);

  const expiredAudit = await prisma.auditLog.count({
    where: { createdAt: { lt: auditCutoff } },
  });

  if (dryRun) {
    return {
      runsDeleted: runIds.length,
      nodeRunsDeleted: nodeRunCount,
      auditDeleted: expiredAudit,
      objectsDeleted: keys.length,
      objectsFailed: [],
    };
  }

  // Storage first: if this fails the rows survive, and the next pass will find
  // them and try again. Deleting the rows first would lose the only pointer to
  // the objects, orphaning them in the bucket permanently.
  const objects = await deleteFromR2(keys);

  // NodeRun cascades from PipelineRun, so removing the parent is sufficient.
  const runs = runIds.length
    ? await prisma.pipelineRun.deleteMany({ where: { id: { in: runIds } } })
    : { count: 0 };

  const audit = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: auditCutoff } },
  });

  return {
    runsDeleted: runs.count,
    nodeRunsDeleted: nodeRunCount,
    auditDeleted: audit.count,
    objectsDeleted: objects.deleted,
    objectsFailed: objects.failed,
  };
}

/**
 * Erases one account and everything belonging to it.
 *
 * Projects, pipelines, runs, transactions and audit rows all cascade from the
 * user row, so the ordering that matters is storage: the object keys have to be
 * gathered while the rows that name them still exist.
 */
export async function deleteAccountData(
  userId: string
): Promise<{ objectsDeleted: number; objectsFailed: { key: string; reason: string }[] }> {
  const nodeRuns = await prisma.nodeRun.findMany({
    where: { run: { pipeline: { project: { userId } } } },
    select: { input: true, output: true },
  });

  const nodeConfigs = await prisma.pipelineNode.findMany({
    where: { pipeline: { project: { userId } } },
    select: { config: true },
  });

  const keys = [
    ...objectKeysFrom(nodeRuns),
    // Uploads attached to a node in the editor were never part of a run.
    ...objectKeysFrom(nodeConfigs.map((n) => ({ input: n.config, output: null }))),
  ];

  const objects = await deleteFromR2(keys);

  // Cascades through projects, pipelines, nodes, edges, runs, node runs,
  // accounts, sessions and audit rows.
  await prisma.user.delete({ where: { id: userId } });

  return { objectsDeleted: objects.deleted, objectsFailed: objects.failed };
}
