/**
 * @file src/app/api/payment/order/route.test.ts
 *
 * High-End Unit Tests for Order Creation Endpoint (`POST /api/payment/order`).
 *
 * Tested Scenarios & Business Rules:
 * 1. Financial Bounds & Input Validation:
 *    - Rejection of amounts below minimum threshold (< ₹25) with HTTP 400.
 *    - Rejection of amounts above ceiling (> ₹10,000) with HTTP 400.
 *    - Rejection of invalid / non-numeric bodies with HTTP 400.
 * 2. Paise Unit Conversion:
 *    - Guarantees exact conversion to paise (1 INR = 100 paise) before calling Razorpay.
 * 3. Database Persistence:
 *    - Verifies server-side creation of `PaymentOrder` with status `'created'`.
 * 4. Error Handling:
 *    - Upstream gateway failures map cleanly to HTTP 502 Bad Gateway.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockDb = vi.hoisted(() => ({
  paymentOrder: { create: vi.fn() },
}));

const mockAuth = vi.hoisted(() => vi.fn());
const mockRazorpayCreate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/prisma', () => ({ default: mockDb, prisma: mockDb }));
vi.mock('@/auth', () => ({ auth: mockAuth }));
vi.mock('razorpay', () => {
  return {
    default: class MockRazorpay {
      orders = { create: mockRazorpayCreate };
    },
  };
});

import { POST } from './route';

function createOrderRequest(body: any): NextRequest {
  return new NextRequest('http://localhost:3000/api/payment/order', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Payment Order Creation (POST /api/payment/order)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = 'rzp_test_valid_key_id';
    process.env.RAZORPAY_KEY_SECRET = 'valid_key_secret';

    mockAuth.mockResolvedValue({
      user: { id: 'user_dev_1' },
    });

    mockRazorpayCreate.mockResolvedValue({
      id: 'order_rzp_mock_123',
      amount: 10000,
      currency: 'INR',
      status: 'created',
    });

    mockDb.paymentOrder.create.mockResolvedValue({});
  });

  describe('1. Top-Up Bounds & Schema Validation', () => {
    it.each([0, 10, 24, -25, -1])(
      'rejects top-up amount ₹%i below minimum ₹25 with 400',
      async (amount) => {
        const req = createOrderRequest({ amount });
        const res = await POST(req);

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe('Invalid request');
        expect(json.details[0].message).toContain('Top-up amount must be at least ₹25');
      }
    );

    it.each([10001, 20000, 50000, 100000])(
      'rejects top-up amount ₹%i above maximum ₹10,000 with 400',
      async (amount) => {
        const req = createOrderRequest({ amount });
        const res = await POST(req);

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe('Invalid request');
        expect(json.details[0].message).toContain('Top-up amount cannot exceed ₹10000');
      }
    );

    it.each(['fifty', null, undefined, {}, true])(
      'rejects non-numeric amount value %s with 400',
      async (amount) => {
        const req = createOrderRequest({ amount });
        const res = await POST(req);

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe('Invalid request');
      }
    );
  });

  describe('2. Successful Order Creation & Gateway Interfacing', () => {
    it.each([25, 50, 100, 500, 1000, 10000])(
      'creates order for valid amount ₹%i and converts to exact paise',
      async (amount) => {
        const req = createOrderRequest({ amount });
        const res = await POST(req);

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.keyId).toBe('rzp_test_valid_key_id');

        // Verify Razorpay was called with amount in paise
        expect(mockRazorpayCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: amount * 100,
            currency: 'INR',
            notes: expect.objectContaining({
              userId: 'user_dev_1',
              amount: String(amount),
            }),
          })
        );

        // Verify PaymentOrder row was persisted
        expect(mockDb.paymentOrder.create).toHaveBeenCalledWith({
          data: {
            id: 'order_rzp_mock_123',
            userId: 'user_dev_1',
            amount,
            currency: 'INR',
            status: 'created',
          },
        });
      }
    );
  });

  describe('3. Upstream Gateway Error Handling', () => {
    it('returns 502 Bad Gateway when Razorpay API rejects order creation', async () => {
      mockRazorpayCreate.mockRejectedValue(new Error('Gateway Timeout'));

      const req = createOrderRequest({ amount: 100 });
      const res = await POST(req);

      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.error).toBe('Could not start the payment. Please try again.');
    });
  });
});
