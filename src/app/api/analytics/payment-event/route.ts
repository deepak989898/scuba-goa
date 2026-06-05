import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import type { PaymentEventType } from "@/lib/ai-analytics/types";
import { linkSessionLeadToPhone, upsertRecoveryLead } from "@/lib/recovery-agent/lead-tracker";

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

  const sessionId = String(body.sessionId ?? "").slice(0, 128) || undefined;
  const phone = String(body.phone ?? "").slice(0, 20) || undefined;
  const name = String(body.name ?? "").slice(0, 80) || undefined;
  const email = String(body.email ?? "").slice(0, 120) || undefined;
  const amountPaise = Number.isFinite(Number(body.amountPaise))
    ? Number(body.amountPaise)
    : undefined;
  const path = String(body.path ?? "").slice(0, 256) || undefined;

  await db.collection("paymentEvents").add({
    eventType,
    sessionId,
    phone,
    name,
    amountPaise,
    razorpayOrderId: String(body.razorpayOrderId ?? "").slice(0, 64) || undefined,
    error: String(body.error ?? "").slice(0, 500) || undefined,
    path,
    createdAt: FieldValue.serverTimestamp(),
  });

  const recoveryEvent =
    eventType === "checkout_started"
      ? "checkout_started"
      : eventType === "checkout_dismissed"
        ? "checkout_dismissed"
        : eventType === "payment_failed"
          ? "payment_failed"
          : eventType === "verify_failed"
            ? "verify_failed"
            : eventType === "payment_success"
              ? "payment_success"
              : null;

  if (recoveryEvent) {
    try {
      if (phone && sessionId) {
        await linkSessionLeadToPhone(sessionId, phone);
      }
      await upsertRecoveryLead({
        sessionId,
        phone,
        name,
        email,
        path,
        event: recoveryEvent,
        amountPaise,
      });
    } catch (e) {
      console.error("[recovery-agent] payment-event lead track failed", e);
    }
  }

  return new NextResponse(null, { status: 204 });
}
