import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  bookingDocToBillPdfInput,
  bookingDocToEmailFields,
} from "@/lib/bookingBillFromFirestore";
import { generateBillPdf } from "@/lib/billPdf";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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

  const data = snap.data() as Record<string, unknown>;
  const emailFields = bookingDocToEmailFields(data, snap.id);
  if (!emailFields) {
    return NextResponse.json(
      { error: "Booking has no valid customer email" },
      { status: 400 }
    );
  }

  const billInput = bookingDocToBillPdfInput(data, snap.id);
  if (!billInput) {
    return NextResponse.json({ error: "Invalid booking data" }, { status: 400 });
  }

  let pdfBytes: Uint8Array | undefined;
  try {
    pdfBytes = await generateBillPdf(billInput);
  } catch (e) {
    console.error("admin booking-send-email PDF failed", e);
  }

  const sent = await sendBookingConfirmationEmail({
    ...emailFields,
    pdfBytes,
  });

  if (!sent) {
    return NextResponse.json(
      {
        error:
          "Email could not be sent. Check RESEND_API_KEY and RESEND_FROM_EMAIL on the server.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
