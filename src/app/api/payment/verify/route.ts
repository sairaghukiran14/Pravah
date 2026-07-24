import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature, 
      amount
    } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const userId = session.user.id;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    const isServerMockMode = !keyId || !keySecret || keyId === 'mock_key_id' || keySecret === 'mock_key_secret';
    const isMockOrder = razorpay_order_id?.startsWith('order_mock_');

    // Handle mock payment verification (only when server keys are not configured AND order is indeed mock)
    if (isServerMockMode && isMockOrder) {
      // Direct credits addition for mock flow
      const updatedUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            credits: { increment: amount }
          }
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            amount: amount,
            type: 'purchase',
            description: `Wallet top-up (Mock Payment: ${razorpay_payment_id || 'manual'})`
          }
        });

        return user;
      });

      return NextResponse.json({ success: true, isMock: true, credits: updatedUser.credits });
    }

    // If keySecret is not configured but a non-mock order is requested, fail
    if (!keySecret) {
      return NextResponse.json({ error: 'Razorpay integration is not configured' }, { status: 500 });
    }

    // Real Signature Verification
    const bodyStr = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(bodyStr.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature verification failed' }, { status: 400 });
    }

    // Add credits to user wallet
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          credits: { increment: amount }
        }
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          amount: amount,
          type: 'purchase',
          description: `Wallet top-up via Razorpay (Ref: ${razorpay_payment_id})`
        }
      });

      return user;
    });

    return NextResponse.json({ success: true, isMock: false, credits: updatedUser.credits });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
