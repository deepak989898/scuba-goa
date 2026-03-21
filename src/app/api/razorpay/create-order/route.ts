import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const publicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Razorpay keys not configured on server" },
      { status: 500 }
    );
  }
  if (publicKeyId && publicKeyId !== keyId) {
    return NextResponse.json(
      {
        error:
          "RAZORPAY_KEY_ID must match NEXT_PUBLIC_RAZORPAY_KEY_ID (same test or live pair). Fix Vercel env.",
      },
      { status: 400 }
    );
  }
  let body: { amount?: number; currency?: string; receipt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json({ error: "Invalid amount (min ₹1)" }, { status: 400 });
  }
  const currency = body.currency ?? "INR";
  const receipt = (body.receipt ?? `rcpt_${Date.now()}`).slice(0, 40);

  const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
  try {
    const order = await rzp.orders.create({
      amount,
      currency,
      receipt,
    });
    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (e: unknown) {
    const err = e as {
      error?: { description?: string };
      message?: string;
    };
    const msg =
      err?.error?.description ?? err?.message ?? "Order creation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
