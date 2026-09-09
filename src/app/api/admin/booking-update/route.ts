import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  buildBookingUpdatePatch,
  validateBookingUpdateInput,
} from "@/lib/admin-booking-update";
import { getAllServicesServer } from "@/lib/get-services-server";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
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

  const paymentId = String(body.paymentId ?? "").trim();
  if (!paymentId) {
    return NextResponse.json({ error: "paymentId required" }, { status: 400 });
  }

  const services = await getAllServicesServer();
  const serviceSlug = String(body.serviceSlug ?? "").trim();
  const serviceFromSlug = serviceSlug
    ? services.find((s) => s.slug === serviceSlug)
    : undefined;
  const customName = String(body.serviceName ?? body.customService ?? "").trim();
  const packageName =
    serviceFromSlug?.title ||
    customName ||
    String(body.packageName ?? "").trim();

  const parsed = validateBookingUpdateInput({
    customerName: String(body.customerName ?? ""),
    phone: String(body.phone ?? ""),
    email: String(body.email ?? ""),
    packageName,
    serviceSlug: serviceSlug || undefined,
    pickupLocation: String(body.hotel ?? body.pickupLocation ?? ""),
    date: String(body.date ?? ""),
    people: Number(body.people ?? 1),
    fullAmountInr: Number(body.fullAmountInr),
    advanceInr: Number(body.advanceInr),
    notes: String(body.notes ?? ""),
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const ref = db.collection("bookings").doc(paymentId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const existing = snap.data() as Record<string, unknown>;
  const patch = buildBookingUpdatePatch(parsed.value, {
    actorId: auth.uid || "admin",
    packageImageUrl: serviceFromSlug?.image?.trim() || undefined,
    existingCartItems: existing.cartItems,
  });

  await ref.set(patch, { merge: true });

  return NextResponse.json({
    ok: true,
    paymentId,
    packageName: parsed.value.packageName,
  });
}
