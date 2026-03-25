import { NextResponse } from "next/server";
import { bookingDocToBillPdfInput } from "@/lib/bookingBillFromFirestore";
import { verifyBookingBillShareToken } from "@/lib/bookingBillShareToken";
import { generateBillPdf } from "@/lib/billPdf";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const paymentId = verifyBookingBillShareToken(token);
  if (!paymentId) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
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
  const input = bookingDocToBillPdfInput(data, snap.id);
  if (!input) {
    return NextResponse.json({ error: "Invalid booking data" }, { status: 400 });
  }

  let pdf: Uint8Array;
  try {
    pdf = await generateBillPdf(input);
  } catch (e) {
    console.error("booking-bill-share PDF failed", e);
    return NextResponse.json({ error: "Could not generate PDF" }, { status: 500 });
  }

  const filename = `bill-${paymentId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 48)}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
