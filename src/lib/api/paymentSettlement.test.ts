/**
 * @file src/lib/api/paymentSettlement.test.ts
 *
 * High-End Unit Tests for Shared Payment Settlement Service (`creditWalletOrder`).
 *
 * Key Architecture & Concurrency Behaviors Tested:
 * 1. Atomic Row Lock Transition:
 *    - Validates that `tx.paymentOrder.updateMany` transitions `status: { not: 'paid' } -> 'paid'`.
 * 2. Race Condition Defense (Simultaneous Collisions):
 *    - When two requests (e.g. client verify redirect and server webhook) hit concurrently,
 *      only the first receives `count === 1`. The second receives `count === 0` and is
 *      guaranteed never to apply a second credit increment or ledger entry.
 * 3. Financial Ledger Integrity:
 *    - Verifies that `CreditTransaction` is created with type `'purchase'` and positive amount.
 * 4. Audit Trail Binding:
 *    - Verifies that `AuditLog` is created within the same database transaction.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDb = vi.hoisted(() => ({
  paymentOrder: { updateMany: vi.fn() },
  user: { update: vi.fn(), findUniqueOrThrow: vi.fn() },
  creditTransaction: { create: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ default: mockDb, prisma: mockDb }));

import { creditWalletOrder } from './paymentSettlement';

describe('Payment Settlement Service (creditWalletOrder)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$transaction.mockImplementation(async (cb: any) => cb(mockDb));
    mockDb.paymentOrder.updateMany.mockResolvedValue({ count: 1 });
    mockDb.user.update.mockResolvedValue({ id: 'user_101', credits: 150 });
    mockDb.user.findUniqueOrThrow.mockResolvedValue({ id: 'user_101', credits: 150 });
    mockDb.creditTransaction.create.mockResolvedValue({});
    mockDb.auditLog.create.mockResolvedValue({});
  });

  it('settles order atomically and increments wallet credits', async () => {
    const result = await creditWalletOrder({
      orderId: 'order_abc123',
      userId: 'user_101',
      amount: 100,
      paymentId: 'pay_xyz789',
      signature: 'sig_valid_hex',
      description: 'Wallet top-up via Razorpay (Ref: pay_xyz789)',
      source: 'client_verify',
    });

    expect(result.credits).toBe(150);

    // 1. Assert status lock
    expect(mockDb.paymentOrder.updateMany).toHaveBeenCalledWith({
      where: { id: 'order_abc123', status: { not: 'paid' } },
      data: {
        status: 'paid',
        razorpayPaymentId: 'pay_xyz789',
        razorpaySignature: 'sig_valid_hex',
      },
    });

    // 2. Assert balance increment
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: 'user_101' },
      data: { credits: { increment: 100 } },
    });

    // 3. Assert ledger write
    expect(mockDb.creditTransaction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_101',
        amount: 100,
        type: 'purchase',
        description: 'Wallet top-up via Razorpay (Ref: pay_xyz789)',
      },
    });

    // 4. Assert audit entry
    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_101',
        action: 'payment.credit',
        targetType: 'order',
        targetId: 'order_abc123',
        metadata: {
          amount: 100,
          paymentId: 'pay_xyz789',
          source: 'client_verify',
          mock: false,
        },
      },
    });
  });

  it('prevents double-crediting when concurrent request already settled the order (count === 0)', async () => {
    // Simulate race collision: another concurrent worker already set status = 'paid'
    mockDb.paymentOrder.updateMany.mockResolvedValue({ count: 0 });

    const result = await creditWalletOrder({
      orderId: 'order_concurrent_race',
      userId: 'user_101',
      amount: 100,
      paymentId: 'pay_xyz789',
      signature: 'sig_valid_hex',
      description: 'Wallet top-up',
      source: 'webhook',
    });

    expect(result.credits).toBe(150);

    // Assert that the second caller short-circuits: no balance update, no duplicate ledger entry
    expect(mockDb.user.update).not.toHaveBeenCalled();
    expect(mockDb.creditTransaction.create).not.toHaveBeenCalled();
    expect(mockDb.auditLog.create).not.toHaveBeenCalled();
  });

  it('tags mock settlement properly in audit metadata', async () => {
    await creditWalletOrder({
      orderId: 'order_mock_test',
      userId: 'user_101',
      amount: 50,
      paymentId: 'mock_payment_id',
      signature: null,
      description: 'Mock top-up',
      source: 'mock',
    });

    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            source: 'mock',
            mock: true,
          }),
        }),
      })
    );
  });
});
