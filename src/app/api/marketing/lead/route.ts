import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  linkSessionLeadToPhone,
  upsertRecoveryLead,
} from "@/lib/recovery-agent/lead-tracker";
import { ANALYTICS_DATA_VERSION } from "@/lib/analytics-v2";

const NAME_MAX = 80;
const ITEM_MAX = 120;
const DATE_MAX = 24;
const SESSION_MAX = 128;

function cleanPhone(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "";
  const d = s.replace(/\D/g, "");
  if (d.length < 10) return "";
  if (d.length > 12) return d.slice(-12);
  return d;
}

/**
 * Booking-form intent is a strong human signal. Ensure the shared analytics
 * session appears under Site analytics → Humans today (even if page-view
 * tracking was blocked by an ad blocker).
 */
async function markSessionAsHumanFromLead(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  sessionId: string,
  name: string,
  interestedItem: string,
) {
  const sessionRef = db.collection("analyticsSessions").doc(sessionId);
  const existing = await sessionRef.get();
  const alreadyLinked = existing.data()?.hasBookingIntent === true;

  await sessionRef.set(
    {
      sessionId,
      lastPath: "/booking",
      isActive: true,
      lastEventType: "click",
      lastSeenAt: FieldValue.serverTimestamp(),
      firstSeenAt: FieldValue.serverTimestamp(),
      isBot: false,
      visitorType: "human",
      isEngagedSession: true,
      hasBookingIntent: true,
      leadName: name.slice(0, 80) || undefined,
      interestedItem: interestedItem.slice(0, 120) || undefined,
      analyticsVersion: ANALYTICS_DATA_VERSION,
    },
    { merge: true },
  );

  // One synthetic view per session so Humans today shows booking leads once.
  if (alreadyLinked) return;

  await db.collection("pageViews").add({
    path: "/booking",
    sessionId,
    eventType: "click",
    clickLabel: "Booking form lead",
    clickCategory: "booking_lead",
    pageLabel: interestedItem
      ? `Booking intent: ${interestedItem.slice(0, 80)}`
      : "Booking form",
    isBot: false,
    visitorType: "human",
    analyticsVersion: ANALYTICS_DATA_VERSION,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function POST(req: Request) {
  const db = getAdminDb();
  if (!db) return new NextResponse(null, { status: 204 });

  let body: {
    name?: string;
    phone?: string;
    interestedItem?: string;
    preferredDate?: string;
    sessionId?: string;
    source?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = cleanPhone(body.phone);
  if (!phone) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  }

  const name =
    typeof body.name === "string" ? body.name.trim().slice(0, NAME_MAX) : "";
  const interestedItem =
    typeof body.interestedItem === "string"
      ? body.interestedItem.trim().slice(0, ITEM_MAX)
      : "";
  const preferredDate =
    typeof body.preferredDate === "string"
      ? body.preferredDate.trim().slice(0, DATE_MAX)
      : "";
  const sessionId =
    typeof body.sessionId === "string"
      ? body.sessionId.trim().slice(0, SESSION_MAX)
      : "";
  const source =
    typeof body.source === "string" ? body.source.trim() : "website";

  try {
    const ref = db.collection("marketingLeads").doc(phone);
    await ref.set(
      {
        phone,
        name,
        interestedItem,
        preferredDate,
        sessionId,
        source: source || "website",
        status: "intent",
        converted: false,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    if (sessionId) {
      await linkSessionLeadToPhone(sessionId, phone);
      try {
        await markSessionAsHumanFromLead(db, sessionId, name, interestedItem);
      } catch (e) {
        console.error("marketing lead analytics link failed", e);
      }
    }
    await upsertRecoveryLead({
      sessionId,
      phone,
      name,
      event: "whatsapp_click",
    });
  } catch (e) {
    console.error("marketing lead write failed", e);
    return NextResponse.json({ error: "Lead save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
