/**
 * @file src/app/api/webhooks/razorpay/route.test.ts
 *
 * Comprehensive Test Suite for Server-to-Server Razorpay Webhook Processing.
 *
 * Tested Scenarios & Security Controls:
 * 1. Missing or unconfigured webhook secret handling (HTTP 500 safety).
 * 2. Cryptographic signature validation:
 *    - Rejection of missing `x-razorpay-signature` headers (HTTP 400).
 *    - Rejection of forged, truncated, or tampered signatures via timing-safe HMAC (HTTP 400).
 * 3. Malformed payload handling (Invalid JSON rejection).
 * 4. Event processing & atomic settlement:
 *    - `payment.captured`: Full settlement, wallet increment, ledger entry, and audit trail.
 *    - `order.paid`: Full settlement and order reconciliation.
 * 5. Idempotency & Deduplication:
 *    - Duplicate webhook deliveries (retries) return HTTP 200 without double-crediting.
 *    - Missing or unrecorded order IDs safely ignored without error storms.
 * 6. Lifecycle resilience:
 *    - Non-settlement events (e.g. `refund.processed`, `payment.failed`) return HTTP 200 to prevent retry storms.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

const mockDb = vi.hoisted(() => ({
  paymentOrder: { findUnique: vi.fn(), updateMany: vi.fn() },
  user: { update: vi.fn(), findUniqueOrThrow: vi.fn() },
  creditTransaction: { create: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ default: mockDb, prisma: mockDb }));

import { POST } from './route';

const TEST_SECRET = 'test_webhook_secret_key_8712361823';

/**
 * Helper to construct a cryptographically signed NextRequest matching Razorpay's format.
 */
function createSignedWebhookRequest(
  body: object | string,
  secret: string = TEST_SECRET,
  overrideSig?: string
): NextRequest {
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
  const signature =
    overrideSig !== undefined
      ? overrideSig
      : crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  return new NextRequest('http://localhost:3000/api/webhooks/razorpay', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': signature,
    },
    body: rawBody,
  });
}

describe('Razorpay Server-to-Server Webhook Handler (POST /api/webhooks/razorpay)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;

    // Simulate Prisma interactive transaction by running the callback with mockDb
    mockDb.$transaction.mockImplementation(async (cb: any) => cb(mockDb));
    mockDb.paymentOrder.updateMany.mockResolvedValue({ count: 1 });
    mockDb.user.update.mockResolvedValue({ id: 'user_1', credits: 250 });
    mockDb.creditTransaction.create.mockResolvedValue({});
    mockDb.auditLog.create.mockResolvedValue({});
  });

  describe('1. Configuration & Signature Security Checks', () => {
    it('returns 500 when webhook secret is completely unconfigured on the server', async () => {
      delete process.env.RAZORPAY_WEBHOOK_SECRET;
      delete process.env.RAZORPAY_KEY_SECRET;

      const req = new NextRequest('http://localhost:3000/api/webhooks/razorpay', {
        method: 'POST',
        headers: { 'x-razorpay-signature': 'any_sig' },
        body: JSON.stringify({ event: 'payment.captured' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe('Webhook secret is not configured on server');
    });

    it('rejects requests missing the x-razorpay-signature header with 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhooks/razorpay', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'payment.captured' }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Missing webhook signature');
    });

    it('rejects forged or tampered HMAC signatures with 400 Bad Request', async () => {
      // Attacker payload signed with a different key
      const req = createSignedWebhookRequest(
        { event: 'payment.captured' },
        'wrong_attacker_secret_key'
      );

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid webhook signature');
    });

    it('rejects requests with malformed JSON body payloads', async () => {
      const invalidJson = '{ "event": "payment.captured", unclosed_json: ';
      const req = createSignedWebhookRequest(invalidJson, TEST_SECRET);

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid JSON payload');
    });
  });

  describe('2. Settlement for payment.captured Events', () => {
    it('settles a valid captured payment: updates status, increments credits, and logs audit', async () => {
      mockDb.paymentOrder.findUnique.mockResolvedValue({
        id: 'order_test_100',
        userId: 'user_target_42',
        amount: 100,
        currency: 'INR',
        status: 'created',
      });

      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_captured_888',
              order_id: 'order_test_100',
              amount: 10000, // 100 INR in paise
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      };

      const req = createSignedWebhookRequest(payload);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ok');
      expect(json.settled).toBe(true);
      expect(json.orderId).toBe('order_test_100');

      // 1. Verify atomic status guard on PaymentOrder
      expect(mockDb.paymentOrder.updateMany).toHaveBeenCalledWith({
        where: { id: 'order_test_100', status: { not: 'paid' } },
        data: expect.objectContaining({
          status: 'paid',
          razorpayPaymentId: 'pay_captured_888',
        }),
      });

      // 2. Verify atomic relative credit increment
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: 'user_target_42' },
        data: { credits: { increment: 100 } },
      });

      // 3. Verify ledger entry
      expect(mockDb.creditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user_target_42',
            amount: 100,
            type: 'purchase',
            description: 'Wallet top-up via Razorpay Webhook (Ref: pay_captured_888)',
          }),
        })
      );

      // 4. Verify audit trail with source tag
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user_target_42',
            action: 'payment.credit',
            targetType: 'order',
            targetId: 'order_test_100',
            metadata: expect.objectContaining({
              amount: 100,
              paymentId: 'pay_captured_888',
              source: 'webhook',
            }),
          }),
        })
      );
    });
  });

  describe('3. Settlement for order.paid Events', () => {
    it('settles an order.paid event using the order entity id', async () => {
      mockDb.paymentOrder.findUnique.mockResolvedValue({
        id: 'order_paid_event_200',
        userId: 'user_target_42',
        amount: 500,
        currency: 'INR',
        status: 'created',
      });

      const payload = {
        event: 'order.paid',
        payload: {
          order: {
            entity: {
              id: 'order_paid_event_200',
              amount: 50000,
              amount_paid: 50000,
              status: 'paid',
            },
          },
          payment: {
            entity: {
              id: 'pay_linked_order_paid',
            },
          },
        },
      };

      const req = createSignedWebhookRequest(payload);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ok');
      expect(json.settled).toBe(true);

      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: 'user_target_42' },
        data: { credits: { increment: 500 } },
      });
    });
  });

  describe('4. Idempotency & Deduplication Guarantees', () => {
    it('short-circuits duplicate webhooks for already-paid orders with zero double-crediting', async () => {
      // Order was already settled by previous webhook or browser callback
      mockDb.paymentOrder.findUnique.mockResolvedValue({
        id: 'order_already_settled',
        userId: 'user_1',
        amount: 100,
        status: 'paid',
      });

      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_duplicate_123',
              order_id: 'order_already_settled',
              amount: 10000,
              status: 'captured',
            },
          },
        },
      };

      const req = createSignedWebhookRequest(payload);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ok');
      expect(json.alreadyProcessed).toBe(true);

      // Guarantees no secondary credit mutation or ledger duplication
      expect(mockDb.user.update).not.toHaveBeenCalled();
      expect(mockDb.creditTransaction.create).not.toHaveBeenCalled();
      expect(mockDb.auditLog.create).not.toHaveBeenCalled();
    });

    it('safely acknowledges unknown orders not created by this app without throwing errors', async () => {
      mockDb.paymentOrder.findUnique.mockResolvedValue(null);

      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_foreign_account',
              order_id: 'order_from_another_app',
              amount: 5000,
            },
          },
        },
      };

      const req = createSignedWebhookRequest(payload);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ignored');
      expect(json.reason).toBe('Order not found in Pravah');
      expect(mockDb.user.update).not.toHaveBeenCalled();
    });
  });

  describe('5. Resilience Against Unhandled / Non-Billing Events', () => {
    it.each([
      ['refund.processed'],
      ['payment.failed'],
      ['transfer.processed'],
      ['dispute.created'],
    ])('acknowledges unhandled %s event with 200 OK to prevent webhook retry storms', async (eventType) => {
      const payload = {
        event: eventType,
        payload: {},
      };

      const req = createSignedWebhookRequest(payload);
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ignored');
      expect(json.event).toBe(eventType);
      expect(mockDb.user.update).not.toHaveBeenCalled();
    });
  });
});
