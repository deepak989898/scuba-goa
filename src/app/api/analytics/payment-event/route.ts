import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import type { PaymentEventType } from "@/lib/ai-analytics/types";

const ALLOWED: PaymentEventType[] = [
  "checkout_started",
  "payment_success",
  "payment_failed",
  "checkout_dismissed",
  "verify_failed",
];

export const runtime = "nodejs";

export async function POST(req: Request) {
  const db = getAdminDb();
  if (!db) {
    return new NextResponse(null, { status: 204 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = String(body.eventType ?? "");
  if (!ALLOWED.includes(eventType as PaymentEventType)) {
    return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
  }

  await db.collection("paymentEvents").add({
    eventType,
    sessionId: String(body.sessionId ?? "").slice(0, 128) || undefined,
    amountPaise: Number.isFinite(Number(body.amountPaise))
      ? Number(body.amountPaise)
      : undefined,
    razorpayOrderId: String(body.razorpayOrderId ?? "").slice(0, 64) || undefined,
    error: String(body.error ?? "").slice(0, 500) || undefined,
    path: String(body.path ?? "").slice(0, 256) || undefined,
    createdAt: FieldValue.serverTimestamp(),
  });

  return new NextResponse(null, { status: 204 });
}
