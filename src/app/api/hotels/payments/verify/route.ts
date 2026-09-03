import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import {
  getHotelBooking,
  markHotelBookingPaid,
  updateHotelBooking,
} from "@/lib/tripjack-hotels/booking-store";

/**
 * Hotel payment verify — marks paid + pending_admin_confirmation.
 * Does NOT call TripJack book/confirm APIs.
 */
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!secret || !keyId) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 });
  }

  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    bookingId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
  }

  const hmac = createHmac("sha256", secret);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = hmac.digest("hex");
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(razorpay_signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const booking = await getHotelBooking(bookingId);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const rzp = new Razorpay({ key_id: keyId, key_secret: secret });
  let paidPaise: number;
  try {
    const payment = (await rzp.payments.fetch(razorpay_payment_id)) as {
      amount?: number;
      order_id?: string;
      status?: string;
    };
    if (payment.order_id && payment.order_id !== razorpay_order_id) {
      return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
    }
    const amt = Number(payment.amount);
    if (!Number.isFinite(amt) || amt < 100) {
      return NextResponse.json({ error: "Invalid payment" }, { status: 400 });
    }
    const st = String(payment.status ?? "").toLowerCase();
    if (st === "failed") {
      await updateHotelBooking(bookingId, {
        status: "payment_failed",
        paymentStatus: "failed",
      });
      return NextResponse.json({ error: "Payment failed" }, { status: 400 });
    }
    paidPaise = Math.round(amt);
  } catch (e) {
    console.error("hotel razorpay fetch failed", e);
    return NextResponse.json({ error: "Could not verify payment" }, { status: 502 });
  }

  const expectedPaise = Math.round(booking.totalFare * 100);
  if (paidPaise !== expectedPaise) {
    return NextResponse.json({ error: "Paid amount does not match booking" }, { status: 400 });
  }

  if (booking.paymentStatus !== "paid") {
    await markHotelBookingPaid(bookingId, razorpay_order_id, razorpay_payment_id);
  }

  return NextResponse.json({
    ok: true,
    bookingId,
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
    status: "pending_admin_confirmation",
    invoiceUrl: `/api/hotels/bookings/${encodeURIComponent(bookingId)}/invoice`,
    successUrl: `/hotels/booking-success?bookingId=${encodeURIComponent(bookingId)}`,
  });
}
