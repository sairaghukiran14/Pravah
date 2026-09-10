import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { creditWalletOrder } from '@/lib/api/paymentSettlement';

export const runtime = 'nodejs';

/**
 * Server-to-Server Razorpay Webhook Handler.
 *
 * This guarantees wallet credit settlement even if the user's browser drops connection,
 * crashes, or closes before the client-side `/api/payment/verify` redirect completes.
 *
 * It validates HMAC-SHA256 signatures in constant time and uses atomic database
 * status transitions to ensure idempotent processing (zero double-crediting).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const webhookSecret =
    process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

  if (!webhookSecret) {
    console.error('[Razorpay Webhook] Secret is not configured.');
    return NextResponse.json(
      { error: 'Webhook secret is not configured on server' },
      { status: 500 }
    );
  }

  const signature = req.headers.get('x-razorpay-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 });
  }

  // 1. Timing-safe cryptographic signature check
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const providedBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  const isValid =
    providedBuf.length === expectedBuf.length &&
    crypto.timingSafeEqual(providedBuf, expectedBuf);

  if (!isValid) {
    console.warn('[Razorpay Webhook] Invalid signature received.');
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const eventType = event?.event;

  // We settle on both 'payment.captured' and 'order.paid' events
  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    const paymentEntity = event?.payload?.payment?.entity;
    const orderEntity = event?.payload?.order?.entity;

    const orderId = paymentEntity?.order_id || orderEntity?.id;
    const paymentId = paymentEntity?.id || event?.payload?.payment?.entity?.id || 'webhook_captured';

    if (!orderId) {
      return NextResponse.json({ status: 'ignored', reason: 'No order_id in event payload' }, { status: 200 });
    }

    const order = await prisma.paymentOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      // Order was not created by this Pravah deployment (e.g. other app on same merchant account)
      return NextResponse.json({ status: 'ignored', reason: 'Order not found in Pravah' }, { status: 200 });
    }

    // Idempotency: if already settled by the frontend callback, acknowledge without re-crediting
    if (order.status === 'paid') {
      return NextResponse.json({ status: 'ok', alreadyProcessed: true }, { status: 200 });
    }

    // Atomic settlement
    await creditWalletOrder({
      userId: order.userId,
      orderId: order.id,
      amount: order.amount,
      paymentId,
      signature,
      description: `Wallet top-up via Razorpay Webhook (Ref: ${paymentId})`,
      source: 'webhook',
    });

    return NextResponse.json({ status: 'ok', settled: true, orderId: order.id }, { status: 200 });
  }

  // Acknowledge other event types (refunds, transfers, etc.) with 200 to prevent retry storms
  return NextResponse.json({ status: 'ignored', event: eventType }, { status: 200 });
}
