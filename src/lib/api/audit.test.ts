import { describe, it, expect, beforeEach, vi } from 'vitest';

const db = vi.hoisted(() => ({ auditLog: { create: vi.fn() } }));
vi.mock('@/lib/prisma', () => ({ default: db, prisma: db }));

import { recordAudit } from './audit';

function reqWith(headers: Record<string, string>) {
  return { headers: new Headers(headers) } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.auditLog.create.mockResolvedValue({});
});

describe('recordAudit', () => {
  it('records the actor, action and target', async () => {
    await recordAudit({
      userId: 'u1',
      action: 'pipeline.delete',
      targetType: 'pipeline',
      targetId: 'p1',
    });

    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        action: 'pipeline.delete',
        targetType: 'pipeline',
        targetId: 'p1',
      }),
    });
  });

  it('captures the caller address and client', async () => {
    await recordAudit({
      userId: 'u1',
      action: 'session.revoke',
      req: reqWith({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1', 'user-agent': 'Firefox/120' }),
    });

    const data = db.auditLog.create.mock.calls[0][0].data;
    expect(data.ip).toBe('203.0.113.9');
    expect(data.userAgent).toBe('Firefox/120');
  });

  // A user agent is unbounded attacker-controlled input.
  it('truncates an oversized user agent', async () => {
    await recordAudit({
      userId: 'u1',
      action: 'session.revoke',
      req: reqWith({ 'user-agent': 'x'.repeat(5000) }),
    });
    expect(db.auditLog.create.mock.calls[0][0].data.userAgent).toHaveLength(256);
  });

  it('records null for address when there is no request', async () => {
    await recordAudit({ userId: 'u1', action: 'session.revoke' });
    const data = db.auditLog.create.mock.calls[0][0].data;
    expect(data.ip).toBeNull();
    expect(data.userAgent).toBeNull();
  });

  it('defaults metadata to an empty object rather than null', async () => {
    await recordAudit({ userId: 'u1', action: 'session.revoke' });
    expect(db.auditLog.create.mock.calls[0][0].data.metadata).toEqual({});
  });

  // The whole point of best-effort: refusing to delete a pipeline because the
  // audit table is unreachable trades a missing line for a broken product.
  it('never throws when the write fails', async () => {
    db.auditLog.create.mockRejectedValue(new Error('audit table unreachable'));
    await expect(
      recordAudit({ userId: 'u1', action: 'pipeline.delete', targetId: 'p1' })
    ).resolves.toBeUndefined();
  });
});
