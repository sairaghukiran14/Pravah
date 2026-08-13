import { describe, it, expect, beforeEach, vi } from 'vitest';

const db = vi.hoisted(() => ({
  creditTransaction: { aggregate: vi.fn() },
  user: { updateMany: vi.fn(), update: vi.fn() },
  pipelineRun: { updateMany: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  nodeRun: { updateMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ default: db, prisma: db }));
vi.mock('@/lib/r2', () => ({ deleteFromR2: vi.fn() }));

import { objectKeysFrom, RUN_RETENTION_DAYS, AUDIT_RETENTION_DAYS } from './retention';
import { creditsSpentToday } from './credits';

describe('objectKeysFrom', () => {
  // These are the two shapes stored data actually takes: generated audio is
  // recorded flat on the node output, uploads arrive inside an envelope.
  it('finds generated audio recorded on a node output', () => {
    const keys = objectKeysFrom([{ input: null, output: { audio_r2_key: 'tts_run_n1_123.wav' } }]);
    expect(keys).toEqual(['tts_run_n1_123.wav']);
  });

  it('finds an upload nested inside its envelope', () => {
    const keys = objectKeysFrom([
      { input: { payload: { file_data: { r2_key: 'audio_input_u1_1_a.pdf' } } }, output: null },
    ]);
    expect(keys).toEqual(['audio_input_u1_1_a.pdf']);
  });

  it('collects from both input and output of the same run', () => {
    const keys = objectKeysFrom([
      {
        input: { file_data: { r2_key: 'in.wav' } },
        output: { audio_r2_key: 'out.wav' },
      },
    ]);
    expect(keys.sort()).toEqual(['in.wav', 'out.wav']);
  });

  it('collects across many runs', () => {
    const keys = objectKeysFrom([
      { input: null, output: { audio_r2_key: 'a.wav' } },
      { input: null, output: { audio_r2_key: 'b.wav' } },
    ]);
    expect(keys).toHaveLength(2);
  });

  // Leaving bytes behind after deleting the rows that point at them means the
  // data is unreachable but not gone, which is not what deletion means.
  it.each([
    ['null payloads', { input: null, output: null }],
    ['plain text output', { input: { text: 'hello' }, output: { response: 'world' } }],
    ['an empty object', { input: {}, output: {} }],
  ])('returns nothing for %s rather than throwing', (_label, run) => {
    expect(objectKeysFrom([run])).toEqual([]);
  });

  it('ignores a non-string key value', () => {
    expect(objectKeysFrom([{ input: null, output: { audio_r2_key: 12345 } }])).toEqual([]);
  });

  // Stops a hostile or malformed payload from walking forever.
  it('stops descending past a sane depth', () => {
    let deep: any = { r2_key: 'buried.wav' };
    for (let i = 0; i < 12; i++) deep = { nested: deep };
    expect(objectKeysFrom([{ input: null, output: deep }])).toEqual([]);
  });
});

describe('retention windows', () => {
  it('keeps customer content for 90 days', () => {
    expect(RUN_RETENTION_DAYS).toBe(90);
  });

  // Longer on purpose: audit rows hold no customer content, and an incident is
  // usually discovered well after it happened.
  it('keeps audit metadata longer than customer content', () => {
    expect(AUDIT_RETENTION_DAYS).toBeGreaterThan(RUN_RETENTION_DAYS);
  });
});

describe('creditsSpentToday', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports consumption as a positive figure', async () => {
    db.creditTransaction.aggregate.mockResolvedValue({ _sum: { amount: -37.5 } });
    await expect(creditsSpentToday('u1')).resolves.toBe(37.5);
  });

  it('reports zero when nothing was spent', async () => {
    db.creditTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } });
    await expect(creditsSpentToday('u1')).resolves.toBe(0);
  });

  it('counts only deductions in the last 24 hours, for this user', async () => {
    db.creditTransaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    await creditsSpentToday('u1');

    const where = db.creditTransaction.aggregate.mock.calls[0][0].where;
    expect(where.userId).toBe('u1');
    expect(where.type).toBe('deduction');
    const since = where.createdAt.gte as Date;
    expect(Math.abs(since.getTime() - (Date.now() - 86_400_000))).toBeLessThan(5_000);
  });

  // Read from the ledger rather than a separate counter, so it cannot drift
  // from what the user was actually charged.
  it('excludes top-ups, which are not consumption', async () => {
    db.creditTransaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    await creditsSpentToday('u1');
    expect(db.creditTransaction.aggregate.mock.calls[0][0].where.type).not.toBe('purchase');
  });
});
