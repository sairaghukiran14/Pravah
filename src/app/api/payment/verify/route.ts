import { z } from 'zod';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { route } from '@/lib/api/route';
import { ApiError, badRequest, notFound } from '@/lib/api/errors';

/**
 * Confirms a Razorpay top-up and credits the user's wallet.
 *
 * The credited amount is always read from the PaymentOrder row this server
 * created — never from the request body. The Razorpay signature only covers
 * "order_id|payment_id", so a client-supplied amount is unauthenticated data
 * and trusting it allows arbitrary credit minting.
 */

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1, 'Missing order id'),
  razorpay_payment_id: z.string().min(1).optional(),
  razorpay_signature: z.string().min(1).optional(),
  // `amount` may still be sent by older clients; it is deliberately ignored.
  amount: z.unknown().optional(),
  isMock: z.unknown().optional(),
});

export const POST = route({ cost: 3, body: bodySchema }, async ({ userId, body }) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // The order is the source of truth for who is credited and how much.
  const order = await prisma.paymentOrder.findUnique({ where: { id: razorpay_order_id } });

  if (!order || order.userId !== userId) throw notFound('Order not found');

  // Idempotency: a settled order can never be credited twice, no matter how
  // many times a valid signature is replayed.
  if (order.status === 'paid') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });
    return { success: true, alreadyProcessed: true, credits: user?.credits ?? 0 };
  }

  const amount = order.amount; // server-side value, not client input

  const isServerMockMode =
    !keyId || !keySecret || keyId === 'mock_key_id' || keySecret === 'mock_key_secret';
  const isMockOrder = razorpay_order_id.startsWith('order_mock_');

  if (isServerMockMode && isMockOrder) {
    const user = await creditWallet({
      userId,
      orderId: razorpay_order_id,
      amount,
      paymentId: razorpay_payment_id || 'mock_payment',
      signature: null,
      description: `Wallet top-up (Mock Payment: ${razorpay_payment_id || 'manual'})`,
    });
    return { success: true, isMock: true, credits: user.credits };
  }

  if (!keySecret || !keyId) {
    throw new ApiError(500, 'Razorpay integration is not configured');
  }

  if (!razorpay_payment_id || !razorpay_signature) {
    throw badRequest('Missing payment credentials');
  }

  // 1. Signature check — proves the order/payment pair came from Razorpay.
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const provided = Buffer.from(razorpay_signature);
  const expected = Buffer.from(expectedSignature);
  const signatureValid =
    provided.length === expected.length && crypto.timingSafeEqual(provided, expected);

  if (!signatureValid) {
    await markFailed(razorpay_order_id);
    throw badRequest('Payment signature verification failed');
  }

  // 2. Confirm with Razorpay that the payment exists, was captured, and matches
  //    this order and amount. A signature alone does not prove money moved.
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  let payment;
  try {
    payment = await razorpay.payments.fetch(razorpay_payment_id);
  } catch (err: any) {
    console.warn('[Razorpay] Payment lookup failed:', err?.error?.description || err?.message);
    await markFailed(razorpay_order_id);
    throw badRequest('Payment could not be confirmed with the payment provider');
  }

  if (
    payment.order_id !== razorpay_order_id ||
    payment.status !== 'captured' ||
    Number(payment.amount) !== Math.round(amount * 100)
  ) {
    await markFailed(razorpay_order_id);
    throw badRequest('Payment could not be confirmed as captured for this order');
  }

  const user = await creditWallet({
    userId,
    orderId: razorpay_order_id,
    amount,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
    description: `Wallet top-up via Razorpay (Ref: ${razorpay_payment_id})`,
  });

  return { success: true, isMock: false, credits: user.credits };
});

async function markFailed(orderId: string): Promise<void> {
  await prisma.paymentOrder
    .update({ where: { id: orderId }, data: { status: 'failed' } })
    .catch((e) => console.warn('Failed to mark order as failed:', e));
}

/**
 * Credits the wallet and settles the order in one transaction. The status guard
 * inside the transaction makes concurrent verify calls safe: only the first
 * transitions 'created' -> 'paid' and credits the balance.
 */
async function creditWallet({
  userId,
  orderId,
  amount,
  paymentId,
  signature,
  description,
}: {
  userId: string;
  orderId: string;
  amount: number;
  paymentId: string;
  signature: string | null;
  description: string;
}) {
  return prisma.$transaction(async (tx) => {
    const settled = await tx.paymentOrder.updateMany({
      where: { id: orderId, status: { not: 'paid' } },
      data: {
        status: 'paid',
        razorpayPaymentId: paymentId,
        ...(signature ? { razorpaySignature: signature } : {}),
      },
    });

    // A concurrent request already settled this order — do not double-credit.
    if (settled.count === 0) {
      return tx.user.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } });
    }

    const user = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    });

    await tx.creditTransaction.create({
      data: { userId, amount, type: 'purchase', description },
    });

    return user;
  });
}
