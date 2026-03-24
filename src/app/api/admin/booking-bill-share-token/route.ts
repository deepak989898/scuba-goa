import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  bookingBillShareTtlHours,
  createBookingBillShareToken,
  getBookingBillShareSecret,
} from "@/lib/bookingBillShareToken";
import { getAdminDb } from "@/lib/firebase-admin";
import { getPublicBaseUrl } from "@/lib/publicRequestOrigin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!getBookingBillShareSecret()) {
    return NextResponse.json(
      {
        error:
          "Set BOOKING_BILL_SHARE_SECRET (recommended) or ensure RAZORPAY_KEY_SECRET is set so bill share links can be signed.",
      },
      { status: 503 }
    );
  }

  let body: { paymentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const paymentId = body.paymentId?.trim();
  if (!paymentId) {
    return NextResponse.json({ error: "paymentId required" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const snap = await db.collection("bookings").doc(paymentId).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const token = createBookingBillShareToken(paymentId);
  if (!token) {
    return NextResponse.json({ error: "Could not create share link" }, { status: 500 });
  }

  const base = getPublicBaseUrl(req);
  const billUrl = `${base}/api/booking-bill-share?token=${encodeURIComponent(token)}`;

  return NextResponse.json({
    billUrl,
    expiresInHours: bookingBillShareTtlHours(),
  });
}
