import { createHmac, timingSafeEqual } from "crypto";
import { after, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getGoaHotelBySlug, findHotelRoom } from "@/lib/goa-hotels/firestore";
import {
  createGoaHotelBooking,
  markGoaHotelBookingEmailSent,
} from "@/lib/goa-hotels/booking-store";
import { computeRoomStayTotalInr, countHotelNights } from "@/lib/goa-hotels/pricing";
import {
  sendHotelBookingAdminEmail,
  sendHotelBookingConfirmationEmail,
} from "@/lib/goa-hotels/email";
import type { GoaHotelBookingDoc } from "@/lib/goa-hotels/types";

type BookingBody = {
  hotelSlug: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guestName: string;
  email: string;
  phone: string;
  amountPaise: number;
};

function normalizePhone(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "";
  const d = s.replace(/\D/g, "");
  if (d.length < 10) return "";
  if (d.length > 12) return d.slice(-12);
  return d;
}

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!secret || !keyId) {
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

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking) {
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

  const hotelSlug = String(booking.hotelSlug ?? "").trim();
  const roomId = String(booking.roomId ?? "").trim();
  const checkIn = String(booking.checkIn ?? "").trim();
  const checkOut = String(booking.checkOut ?? "").trim();
  const guestName = String(booking.guestName ?? "").trim();
  const email = String(booking.email ?? "").trim().toLowerCase();
  const phone = normalizePhone(booking.phone);
  const adults = Math.max(1, Math.floor(Number(booking.adults) || 1));
  const children = Math.max(0, Math.floor(Number(booking.children) || 0));
  const clientPaise = Math.floor(Number(booking.amountPaise) || 0);

  if (!hotelSlug || !roomId || !checkIn || !checkOut || !guestName || !email || !phone) {
    return NextResponse.json({ error: "Incomplete guest details" }, { status: 400 });
  }

  const nights = countHotelNights(checkIn, checkOut);
  if (nights < 1) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }

  const hotel = await getGoaHotelBySlug(hotelSlug);
  if (!hotel) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }

  const room = findHotelRoom(hotel, roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 400 });
  }

  const expectedInr = computeRoomStayTotalInr(room.pricePerNight, nights);
  const expectedPaise = expectedInr * 100;
  if (expectedPaise < 100 || clientPaise !== expectedPaise) {
    return NextResponse.json({ error: "Amount mismatch — refresh and try again" }, { status: 400 });
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
    paidPaise = Number(payment.amount);
    if (!Number.isFinite(paidPaise) || paidPaise !== expectedPaise) {
      return NextResponse.json({ error: "Payment amount invalid" }, { status: 400 });
    }
    const st = String(payment.status ?? "").toLowerCase();
    if (st !== "captured" && st !== "authorized") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }
  } catch (e) {
    console.error("[hotels] verify fetch payment", e);
    return NextResponse.json({ error: "Could not verify payment" }, { status: 500 });
  }

  const now = new Date().toISOString();
  const doc: GoaHotelBookingDoc = {
    bookingId: razorpay_payment_id,
    hotelId: hotel.id,
    hotelSlug: hotel.slug,
    hotelName: hotel.name,
    hotelLocality: hotel.locality ?? hotel.location,
    roomId: room.id,
    roomName: room.name,
    mealBasisLabel: room.mealBasisLabel,
    checkIn,
    checkOut,
    nights,
    adults,
    children,
    guestName,
    email,
    phone,
    amountPaise: paidPaise,
    totalAmountInr: expectedInr,
    currency: "INR",
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    status: "paid",
    createdAt: now,
    updatedAt: now,
    emailSent: false,
    adminEmailSent: false,
  };

  try {
    await createGoaHotelBooking(doc);
  } catch (e) {
    console.error("[hotels] save booking", e);
    return NextResponse.json({ error: "Could not save booking" }, { status: 500 });
  }

  const emailPayload = {
    to: email,
    guestName,
    hotelName: hotel.name,
    roomName: room.name,
    checkIn,
    checkOut,
    nights,
    adults,
    children,
    amountInr: expectedInr,
    paymentId: razorpay_payment_id,
    locality: hotel.locality ?? hotel.location,
  };

  try {
    const sent = await sendHotelBookingConfirmationEmail(emailPayload);
    if (sent) await markGoaHotelBookingEmailSent(razorpay_payment_id);
  } catch (e) {
    console.error("[hotels] customer email", e);
  }

  after(async () => {
    try {
      await sendHotelBookingAdminEmail(emailPayload);
    } catch (e) {
      console.error("[hotels] admin email", e);
    }
  });

  return NextResponse.json({
    ok: true,
    bookingId: razorpay_payment_id,
    successUrl: `/hotels/booking-success?bookingId=${encodeURIComponent(razorpay_payment_id)}`,
  });
}
