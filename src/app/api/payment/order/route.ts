import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import Razorpay from 'razorpay';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await req.json();
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid top-up amount' }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Developer experience: Fallback to mock order if key is not configured
    if (!keyId || !keySecret || keyId === 'mock_key_id') {
      const mockOrder = {
        id: `order_mock_${Math.random().toString(36).substring(7)}`,
        amount: amount * 100,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        status: 'created',
        notes: { mock: true, userId: session.user.id, amount }
      };

      // Save mock order to DB
      await prisma.paymentOrder.create({
        data: {
          id: mockOrder.id,
          userId: session.user.id,
          amount: amount,
          currency: 'INR',
          status: 'created',
        }
      });

      return NextResponse.json({ success: true, isMock: true, order: mockOrder, keyId: 'mock_key_id' });
    }

    console.log(`[Razorpay] Creating order: ₹${amount}, key prefix: ${keyId.substring(0, 12)}...`);

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // amount in paise
      currency: 'INR',
      receipt: `receipt_topup_${session.user.id.substring(0, 8)}_${Date.now()}`,
      notes: {
        userId: session.user.id,
        amount: String(amount),
      },
    });

    // Save real Razorpay order to DB
    await prisma.paymentOrder.create({
      data: {
        id: order.id,
        userId: session.user.id,
        amount: amount,
        currency: 'INR',
        status: 'created',
      }
    });

    return NextResponse.json({ success: true, isMock: false, order, keyId });
  } catch (error: any) {
    // Razorpay SDK wraps errors with statusCode and error fields
    const razorpayError = error?.error || error;
    const statusCode = razorpayError?.statusCode || error?.statusCode || 500;
    const description =
      razorpayError?.description ||
      razorpayError?.message ||
      error?.message ||
      'Failed to create payment order';

    console.error('[Razorpay] Order creation failed:', {
      statusCode,
      description,
      code: razorpayError?.code,
      reason: razorpayError?.reason,
      source: razorpayError?.source,
      field: razorpayError?.field,
      raw: JSON.stringify(error).substring(0, 500),
    });

    return NextResponse.json(
      {
        error: description,
        code: razorpayError?.code,
        reason: razorpayError?.reason,
      },
      { status: typeof statusCode === 'number' ? statusCode : 500 }
    );
  }
}
