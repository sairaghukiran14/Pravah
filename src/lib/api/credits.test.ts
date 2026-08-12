import { describe, it, expect, beforeEach, vi } from 'vitest';

const db = vi.hoisted(() => ({
  user: { updateMany: vi.fn(), update: vi.fn() },
  pipelineRun: { updateMany: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  nodeRun: { updateMany: vi.fn() },
  creditTransaction: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ default: db, prisma: db }));

import {
  reserveCredits,
  settleCredits,
  releaseReservation,
  reapStaleRuns,
  countActiveRuns,
  RUN_RESERVATION,
  STALE_RUN_MINUTES,
} from './credits';

/** Runs the callback form of $transaction against the mocked client. */
function runTransactionsInline() {
  db.$transaction.mockImplementation(async (arg: any) =>
    typeof arg === 'function' ? arg(db) : arg
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  runTransactionsInline();
  db.user.update.mockResolvedValue({});
  db.user.updateMany.mockResolvedValue({ count: 1 });
  db.pipelineRun.updateMany.mockResolvedValue({ count: 1 });
  db.nodeRun.updateMany.mockResolvedValue({ count: 0 });
  db.creditTransaction.create.mockResolvedValue({});
});

describe('reserveCredits', () => {
  it('holds credit and reports success', async () => {
    await expect(reserveCredits('u1', 10)).resolves.toBe(true);
  });

  it('reports failure when the conditional update matched no row', async () => {
    db.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(reserveCredits('u1', 10)).resolves.toBe(false);
  });

  // The whole point of the reservation: the balance check and the decrement
  // must be one statement, or concurrent runs all observe the same balance.
  it('guards the decrement with a balance condition in the same statement', async () => {
    await reserveCredits('u1', 7);
    const call = db.user.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'u1', credits: { gte: 7 } });
    expect(call.data).toEqual({ credits: { decrement: 7 } });
  });

  it('defaults to the configured run reservation', async () => {
    await reserveCredits('u1');
    expect(db.user.updateMany.mock.calls[0][0].where.credits.gte).toBe(RUN_RESERVATION);
  });
});

describe('settleCredits', () => {
  it('refunds the unused portion of the hold', async () => {
    await settleCredits({ userId: 'u1', reserved: 10, actualCost: 4, runId: 'run_1' });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { credits: { increment: 6 } },
    });
  });

  // The under-billing regression: settlement used to receive
  // Math.min(totalCost, reserved), so everything above the hold was absorbed.
  it('charges the excess when a run cost more than was held', async () => {
    await settleCredits({ userId: 'u1', reserved: 10, actualCost: 13.5, runId: 'run_1' });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { credits: { increment: -3.5 } },
    });
  });

  it('writes a ledger entry for what was actually consumed', async () => {
    await settleCredits({ userId: 'u1', reserved: 10, actualCost: 4, runId: 'run_1' });
    expect(db.creditTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: -4, type: 'deduction' }) })
    );
  });

  it('skips the balance write when the hold exactly matched the cost', async () => {
    await settleCredits({ userId: 'u1', reserved: 10, actualCost: 10, runId: 'run_1' });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('claims the hold before refunding it', async () => {
    await settleCredits({ userId: 'u1', reserved: 10, actualCost: 4, runId: 'run_1' });
    expect(db.pipelineRun.updateMany).toHaveBeenCalledWith({
      where: { id: 'run_1', reservedCredits: { not: null } },
      data: { reservedCredits: null },
    });
  });

  // Settlement and the reaper can both reach the same run. Only one may refund.
  it('does nothing when the hold was already released', async () => {
    db.pipelineRun.updateMany.mockResolvedValue({ count: 0 });
    await settleCredits({ userId: 'u1', reserved: 10, actualCost: 4, runId: 'run_1' });
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.creditTransaction.create).not.toHaveBeenCalled();
  });

  it('settles unconditionally when no run row was ever created', async () => {
    await settleCredits({ userId: 'u1', reserved: 10, actualCost: 0, runId: null });
    expect(db.pipelineRun.updateMany).not.toHaveBeenCalled();
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { credits: { increment: 10 } },
    });
  });
});

describe('releaseReservation', () => {
  it('returns the whole hold', async () => {
    await releaseReservation('u1', 10);
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { credits: { increment: 10 } },
    });
  });

  it('does nothing for a zero hold', async () => {
    await releaseReservation('u1', 0);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe('reapStaleRuns', () => {
  it('does nothing when no run is stale', async () => {
    db.pipelineRun.findMany.mockResolvedValue([]);
    await expect(reapStaleRuns('u1')).resolves.toBe(0);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('fails abandoned runs and returns the credit they held', async () => {
    db.pipelineRun.findMany.mockResolvedValue([
      { id: 'run_1', reservedCredits: 10 },
      { id: 'run_2', reservedCredits: 4 },
    ]);

    await expect(reapStaleRuns('u1')).resolves.toBe(2);

    expect(db.pipelineRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['run_1', 'run_2'] } },
        data: expect.objectContaining({ status: 'failed' }),
      })
    );
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { credits: { increment: 14 } },
    });
  });

  it('does not refund a run whose hold was already claimed elsewhere', async () => {
    db.pipelineRun.findMany.mockResolvedValue([{ id: 'run_1', reservedCredits: 10 }]);
    db.pipelineRun.updateMany.mockResolvedValue({ count: 0 }); // claim lost

    await reapStaleRuns('u1');
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('only considers runs older than the staleness cutoff', async () => {
    db.pipelineRun.findMany.mockResolvedValue([]);
    await reapStaleRuns('u1');

    const where = db.pipelineRun.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('running');
    const cutoff = where.startedAt.lt as Date;
    const expected = Date.now() - STALE_RUN_MINUTES * 60_000;
    expect(Math.abs(cutoff.getTime() - expected)).toBeLessThan(5_000);
  });
});

describe('countActiveRuns', () => {
  // A killed function leaves its run 'running' forever. Counting those against
  // the concurrency limit locked the user out of their own account.
  it('ignores runs that are past the staleness cutoff', async () => {
    db.pipelineRun.count.mockResolvedValue(1);
    await countActiveRuns('u1');

    const where = db.pipelineRun.count.mock.calls[0][0].where;
    expect(where.status).toBe('running');
    expect(where.startedAt.gte).toBeInstanceOf(Date);
  });

  it('scopes the count to the caller', async () => {
    db.pipelineRun.count.mockResolvedValue(0);
    await countActiveRuns('u1');
    expect(db.pipelineRun.count.mock.calls[0][0].where.pipeline).toEqual({
      project: { userId: 'u1' },
    });
  });
});
