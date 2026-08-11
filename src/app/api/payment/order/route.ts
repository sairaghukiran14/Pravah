import { z } from 'zod';
import Razorpay from 'razorpay';
import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { ApiError } from '@/lib/api/errors';

const MAX_TOPUP = Number(process.env.MAX_TOPUP_AMOUNT || 100_000);

const bodySchema = z.object({
  amount: z
    .number()
    .positive('Enter a top-up amount greater than zero')
    .max(MAX_TOPUP, `Top-up amount cannot exceed ${MAX_TOPUP}`),
});

export const POST = route({ cost: 3, body: bodySchema }, async ({ userId, body }) => {
  const { amount } = body;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // Development convenience: without configured keys, create a mock order so the
  // checkout flow can be exercised locally.
  if (!keyId || !keySecret || keyId === 'mock_key_id') {
    const mockOrder = {
      id: `order_mock_${Math.random().toString(36).substring(7)}`,
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      status: 'created',
      notes: { mock: true, userId, amount },
    };

    await prisma.paymentOrder.create({
      data: { id: mockOrder.id, userId, amount, currency: 'INR', status: 'created' },
    });

    return { success: true, isMock: true, order: mockOrder, keyId: 'mock_key_id' };
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  let order;
  try {
    order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: `receipt_topup_${userId.substring(0, 8)}_${Date.now()}`,
      notes: { userId, amount: String(amount) },
    });
  } catch (error: any) {
    const rzp = error?.error || error;
    console.error('[Razorpay] Order creation failed:', {
      statusCode: rzp?.statusCode ?? error?.statusCode,
      description: rzp?.description,
      code: rzp?.code,
    });
    throw new ApiError(502, 'Could not start the payment. Please try again.');
  }

  // The stored amount is what /api/payment/verify credits — never a client value.
  await prisma.paymentOrder.create({
    data: { id: order.id, userId, amount, currency: 'INR', status: 'created' },
  });

  return { success: true, isMock: false, order, keyId };
});
