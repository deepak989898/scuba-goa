import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getHotelBooking, updateHotelBooking } from "@/lib/tripjack-hotels/booking-store";

export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const publicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 });
  }
  if (publicKeyId && publicKeyId !== keyId) {
    return NextResponse.json({ error: "Razorpay key mismatch" }, { status: 400 });
  }

  let body: { bookingId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const bookingId = String(body.bookingId ?? "").trim();
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }

  const booking = await getHotelBooking(bookingId);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.paymentStatus === "paid") {
    return NextResponse.json({ error: "Already paid" }, { status: 400 });
  }

  const amountPaise = Math.round(booking.totalFare * 100);
  if (!Number.isFinite(amountPaise) || amountPaise < 100) {
    return NextResponse.json({ error: "Invalid booking amount" }, { status: 400 });
  }

  const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
  try {
    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: booking.currency || "INR",
      receipt: bookingId.slice(0, 40),
      notes: {
        product: "hotel",
        bookingId,
        hotelId: booking.tjHotelId,
      },
    });

    await updateHotelBooking(bookingId, {
      razorpayOrderId: order.id,
      status: "payment_pending",
      paymentStatus: "pending",
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingId,
    });
  } catch (e: unknown) {
    const err = e as { error?: { description?: string }; message?: string };
    const msg = err?.error?.description ?? err?.message ?? "Order creation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
