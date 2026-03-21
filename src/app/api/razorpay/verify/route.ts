import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

type BookingBody = Record<string, unknown> & {
  packageId: string;
  packageName: string;
  customerName: string;
  email: string;
  phone: string;
  date: string;
  people: number;
  amountPaise: number;
};

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
  }
  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    booking?: BookingBody;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking } =
    body;
  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !booking
  ) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const hmac = createHmac("sha256", secret);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = hmac.digest("hex");
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(razorpay_signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = getAdminDb();
  if (db) {
    const ref = db.collection("bookings").doc(razorpay_payment_id);
    await ref.set({
      ...booking,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: "paid",
      createdAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true, stored: Boolean(db) });
}
