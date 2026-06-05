import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { computeLeadScore } from "@/lib/recovery-agent/scoring";
import type { RecoveryLeadDoc } from "@/lib/recovery-agent/types";
import { stripUndefinedDeep } from "@/lib/firestore-json";

function cleanPhone(raw?: string): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.length < 10) return "";
  return d.length > 12 ? d.slice(-12) : d;
}

function leadIdFor(sessionId: string, phone?: string): string {
  const p = cleanPhone(phone);
  if (p) return `phone_${p}`;
  const sid = sessionId.trim() || "anon";
  return `sid_${sid}`;
}

function emptySignals(): RecoveryLeadDoc["signals"] {
  return {
    whatsappClicks: 0,
    bookingPageViews: 0,
    checkoutStarted: 0,
    paymentFailed: 0,
    checkoutDismissed: 0,
    verifyFailed: 0,
    pricingPageViews: 0,
    sessionCount: 1,
    totalDwellSec: 0,
  };
}

export async function upsertRecoveryLead(input: {
  sessionId?: string;
  phone?: string;
  name?: string;
  email?: string;
  path?: string;
  landingPath?: string;
  event:
    | "whatsapp_click"
    | "booking_page_view"
    | "pricing_page_view"
    | "checkout_started"
    | "checkout_dismissed"
    | "payment_failed"
    | "verify_failed"
    | "payment_success"
    | "session_visit";
  amountPaise?: number;
  dwellSec?: number;
}): Promise<string | null> {
  const db = getAdminDb();
  if (!db) return null;

  const sessionId = String(input.sessionId ?? "anon").slice(0, 128);
  const phone = cleanPhone(input.phone);
  const leadId = leadIdFor(sessionId, phone);
  const now = new Date().toISOString();

  const ref = db.collection("recoveryLeads").doc(leadId);
  const snap = await ref.get();
  const existing = snap.exists
    ? (snap.data() as RecoveryLeadDoc)
    : null;

  const signals = existing?.signals ?? emptySignals();

  switch (input.event) {
    case "whatsapp_click":
      signals.whatsappClicks += 1;
      break;
    case "booking_page_view":
      signals.bookingPageViews += 1;
      break;
    case "pricing_page_view":
      signals.pricingPageViews += 1;
      break;
    case "checkout_started":
      signals.checkoutStarted += 1;
      break;
    case "checkout_dismissed":
      signals.checkoutDismissed += 1;
      break;
    case "payment_failed":
      signals.paymentFailed += 1;
      break;
    case "verify_failed":
      signals.verifyFailed += 1;
      break;
    case "session_visit":
      signals.sessionCount += 1;
      break;
    default:
      break;
  }

  if (input.dwellSec && input.dwellSec > 0) {
    signals.totalDwellSec += input.dwellSec;
  }
  if (input.amountPaise && input.amountPaise > 0) {
    signals.lastAmountPaise = input.amountPaise;
  }

  const { score, temperature } = computeLeadScore(signals);

  let status: RecoveryLeadDoc["status"] = existing?.status ?? "active";
  if (input.event === "payment_success") {
    status = "converted";
  }

  const doc: RecoveryLeadDoc = {
    leadId,
    sessionId: phone && existing?.sessionId ? existing.sessionId : sessionId,
    phone: phone || existing?.phone,
    name: input.name?.trim() || existing?.name,
    email: input.email?.trim() || existing?.email,
    status,
    temperature,
    score,
    signals,
    lastPath: input.path || existing?.lastPath,
    landingPath: input.landingPath || existing?.landingPath,
    lastEventAt: now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    convertedAt: input.event === "payment_success" ? now : existing?.convertedAt,
    recovery: existing?.recovery ?? { attempts: 0 },
  };

  await ref.set(stripUndefinedDeep(doc), { merge: true });

  if (
    input.event === "checkout_dismissed" ||
    input.event === "payment_failed" ||
    input.event === "verify_failed"
  ) {
    await db.collection("recoveryAbandonedBookings").add({
      leadId,
      sessionId,
      phone: phone || undefined,
      eventType: input.event,
      amountPaise: input.amountPaise,
      path: input.path,
      createdAt: now,
    });
  }

  return leadId;
}

/** Merge session-only lead into phone lead when phone becomes known. */
export async function linkSessionLeadToPhone(
  sessionId: string,
  phone: string,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  const p = cleanPhone(phone);
  if (!p || !sessionId) return;

  const sidRef = db.collection("recoveryLeads").doc(leadIdFor(sessionId));
  const phoneRef = db.collection("recoveryLeads").doc(leadIdFor(sessionId, p));

  const sidSnap = await sidRef.get();
  if (!sidSnap.exists) {
    await upsertRecoveryLead({ sessionId, phone: p, event: "session_visit" });
    return;
  }

  const sidData = sidSnap.data() as RecoveryLeadDoc;
  const phoneSnap = await phoneRef.get();
  const phoneData = phoneSnap.exists ? (phoneSnap.data() as RecoveryLeadDoc) : null;

  const mergedSignals = { ...emptySignals() };
  const a = sidData.signals;
  const b = phoneData?.signals ?? emptySignals();
  for (const k of Object.keys(mergedSignals) as (keyof RecoveryLeadDoc["signals"])[]) {
    if (k === "lastAmountPaise") {
      mergedSignals.lastAmountPaise = b.lastAmountPaise ?? a.lastAmountPaise;
    } else {
      mergedSignals[k] = (a[k] as number) + (b[k] as number);
    }
  }

  const { score, temperature } = computeLeadScore(mergedSignals);
  const now = new Date().toISOString();

  await phoneRef.set(
    stripUndefinedDeep({
      leadId: phoneRef.id,
      sessionId,
      phone: p,
      name: phoneData?.name || sidData.name,
      status: phoneData?.status === "converted" || sidData.status === "converted" ? "converted" : "active",
      temperature,
      score,
      signals: mergedSignals,
      lastPath: phoneData?.lastPath || sidData.lastPath,
      landingPath: phoneData?.landingPath || sidData.landingPath,
      lastEventAt: now,
      createdAt: phoneData?.createdAt || sidData.createdAt,
      updatedAt: now,
      recovery: phoneData?.recovery || sidData.recovery || { attempts: 0 },
    }),
    { merge: true },
  );

  await sidRef.delete().catch(() => {});
}
