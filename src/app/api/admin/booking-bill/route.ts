import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { generateBillPdf } from "@/lib/billPdf";
import { bookingDocToBillPdfInput } from "@/lib/bookingBillFromFirestore";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const paymentId = url.searchParams.get("paymentId")?.trim();
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
  const input = bookingDocToBillPdfInput(data, snap.id);
  if (!input) {
    return NextResponse.json({ error: "Invalid booking data" }, { status: 400 });
  }

  let pdf: Uint8Array;
  try {
    pdf = await generateBillPdf(input);
  } catch (e) {
    console.error("admin booking-bill PDF failed", e);
    return NextResponse.json({ error: "Could not generate PDF" }, { status: 500 });
  }

  const filename = `bill-${paymentId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 48)}.pdf`;

  // Copy into a tight Uint8Array so the Response body is exactly the PDF bytes
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
