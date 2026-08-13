import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { clientIpFrom } from './rateLimit';

/**
 * Records what was done, by whom, and from where.
 *
 * Deliberately best-effort: a failure to write the log must never fail the
 * action it describes. Refusing to delete someone's pipeline because the audit
 * table is unreachable trades a missing line for a broken product, so writes
 * are fire-and-forget and failures are logged rather than raised.
 *
 * What goes in `metadata` is names and counts — never the contents of a
 * customer's document, transcript or audio. The point is to reconstruct who did
 * what during an incident, not to build a second copy of their data.
 */

export type AuditAction =
  | 'session.revoke'
  | 'pipeline.delete'
  | 'pipeline.run'
  | 'project.delete'
  | 'payment.credit';

export interface AuditEntry {
  userId: string;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  req?: NextRequest;
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const headers = entry.req?.headers;
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        metadata: (entry.metadata ?? {}) as any,
        ip: headers ? clientIpFrom(headers) : null,
        // Truncated: a user agent is unbounded attacker-controlled input, and
        // the make and version is all that is ever useful here.
        userAgent: headers?.get('user-agent')?.slice(0, 256) ?? null,
      },
    });
  } catch (error) {
    console.error('[audit] Failed to record entry:', entry.action, error);
  }
}
