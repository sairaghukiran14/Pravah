import prisma from '@/lib/prisma';

export interface SettleOrderParams {
  orderId: string;
  userId: string;
  amount: number;
  paymentId: string;
  signature?: string | null;
  description: string;
  source?: 'client_verify' | 'webhook' | 'mock';
}

/**
 * Credits the user's wallet and settles the PaymentOrder in one atomic database transaction.
 *
 * An atomic conditional status guard (`status: { not: 'paid' }`) guarantees that if both
 * the client-side verification and the Razorpay server webhook hit simultaneously (or if
 * a webhook is retried), only the first transaction transitions 'created' -> 'paid' and
 * increments user credits. The second caller receives `count === 0` and safely short-circuits.
 */
export async function creditWalletOrder({
  orderId,
  userId,
  amount,
  paymentId,
  signature = null,
  description,
  source = 'client_verify',
}: SettleOrderParams) {
  return prisma.$transaction(async (tx) => {
    const settled = await tx.paymentOrder.updateMany({
      where: { id: orderId, status: { not: 'paid' } },
      data: {
        status: 'paid',
        razorpayPaymentId: paymentId,
        ...(signature ? { razorpaySignature: signature } : {}),
      },
    });

    // A concurrent request (or prior webhook) already settled this order — do not double-credit.
    if (settled.count === 0) {
      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { credits: true },
      });
    }

    const user = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type: 'purchase',
        description,
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: 'payment.credit',
        targetType: 'order',
        targetId: orderId,
        metadata: {
          amount,
          paymentId,
          source,
          mock: signature === null && source === 'mock',
        },
      },
    });

    return user;
  });
}
