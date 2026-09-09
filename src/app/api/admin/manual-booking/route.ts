import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  bookingDocToBillPdfInput,
} from "@/lib/bookingBillFromFirestore";
import { createBookingBillShareToken } from "@/lib/bookingBillShareToken";
import { generateBillPdf } from "@/lib/billPdf";
import { sendBookingConfirmationEmailDetailed } from "@/lib/email";
import { getAllServicesServer } from "@/lib/get-services-server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  buildManualBookingDoc,
  createManualBookingId,
  validateManualBookingInput,
} from "@/lib/manual-booking";
import { getPublicBaseUrl } from "@/lib/publicRequestOrigin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validateManualBookingInput({
    customerName: String(body.customerName ?? ""),
    phone: String(body.phone ?? ""),
    email: String(body.email ?? ""),
    serviceSlug: String(body.serviceSlug ?? ""),
    serviceName: String(body.serviceName ?? ""),
    hotel: String(body.hotel ?? ""),
    date: String(body.date ?? ""),
    people: Number(body.people ?? 1),
    fullAmountInr: Number(body.fullAmountInr),
    advanceInr: Number(body.advanceInr),
    notes: String(body.notes ?? ""),
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const sendEmail = body.sendEmail === true;
  if (sendEmail && !parsed.value.email?.includes("@")) {
    return NextResponse.json(
      { error: "Enter a valid guest email to send the invoice." },
      { status: 400 },
    );
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const services = await getAllServicesServer();
  const serviceFromSlug = parsed.value.serviceSlug
    ? services.find((s) => s.slug === parsed.value.serviceSlug)
    : undefined;
  const packageName =
    serviceFromSlug?.title ||
    parsed.value.serviceName ||
    parsed.value.serviceSlug ||
    "Activity booking";

  const bookingId = createManualBookingId();
  const actorId = auth.uid || "admin";
  const doc = buildManualBookingDoc(parsed.value, {
    bookingId,
    packageName,
    actorId,
  });

  await db.collection("bookings").doc(bookingId).set(doc);

  const billInput = bookingDocToBillPdfInput(doc, bookingId);
  if (!billInput) {
    return NextResponse.json(
      { error: "Booking saved but bill data was invalid." },
      { status: 500 },
    );
  }

  let pdfBytes: Uint8Array | undefined;
  try {
    pdfBytes = await generateBillPdf(billInput);
  } catch (e) {
    console.error("manual-booking PDF failed", e);
  }

  const shareToken = createBookingBillShareToken(bookingId);
  const baseUrl = getPublicBaseUrl(req);
  const invoiceDownloadUrl = shareToken
    ? `${baseUrl}/api/booking-bill-share?token=${encodeURIComponent(shareToken)}&download=1`
    : undefined;

  let emailSent = false;
  let emailError: string | undefined;
  if (sendEmail && parsed.value.email) {
    const mail = await sendBookingConfirmationEmailDetailed({
      to: parsed.value.email,
      customerName: parsed.value.customerName,
      packageName,
      date: parsed.value.date,
      people: parsed.value.people ?? 1,
      amountInr: parsed.value.advanceInr,
      fullAmountInr: parsed.value.fullAmountInr,
      balanceInr: Math.max(0, parsed.value.fullAmountInr - parsed.value.advanceInr),
      paymentId: bookingId,
      pdfBytes,
      invoiceUrl: invoiceDownloadUrl,
    });
    emailSent = mail.ok;
    if (!mail.ok) emailError = mail.error ?? "Email send failed";
  }

  await db.collection("bookings").doc(bookingId).set(
    {
      invoiceShareCreated: Boolean(shareToken),
      emailSent,
      emailError: emailError ?? null,
    },
    { merge: true },
  );

  return NextResponse.json({
    ok: true,
    bookingId,
    packageName,
    emailSent,
    emailError,
    invoiceDownloadUrl,
    pdfGenerated: Boolean(pdfBytes && pdfBytes.length > 0),
  });
}
