import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import Razorpay from 'razorpay';

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
      return NextResponse.json({ success: true, isMock: true, order: mockOrder, keyId: 'mock_key_id' });
    }

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

    return NextResponse.json({ success: true, isMock: false, order, keyId });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
