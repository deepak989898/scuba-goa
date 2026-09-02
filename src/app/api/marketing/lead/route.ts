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
const EMAIL_MAX = 120;
const PATH_MAX = 200;

function cleanPhone(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "";
  const d = s.replace(/\D/g, "");
  if (d.length < 10) return "";
  if (d.length > 12) return d.slice(-12);
  return d;
}

function cleanEmail(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim().slice(0, EMAIL_MAX) : "";
  if (!s) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : "";
}

type LeadAnalyticsOpts = {
  name: string;
  email?: string;
  phone?: string;
  interestedItem: string;
  source: string;
  path: string;
};

/**
 * Strong human signal from lead capture. Ensures session appears under
 * Site analytics → Humans and stores contact on the session doc.
 */
async function markSessionAsHumanFromLead(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  sessionId: string,
  opts: LeadAnalyticsOpts,
) {
  const sessionRef = db.collection("analyticsSessions").doc(sessionId);
  const existing = await sessionRef.get();
  const isPopup = opts.source === "visitor_popup";
  const alreadyLinked =
    isPopup
      ? existing.data()?.hasLeadCapture === true
      : existing.data()?.hasBookingIntent === true;

  const sessionPatch: Record<string, unknown> = {
    sessionId,
    lastPath: opts.path,
    isActive: true,
    lastEventType: "click",
    lastSeenAt: FieldValue.serverTimestamp(),
    firstSeenAt: FieldValue.serverTimestamp(),
    isBot: false,
    visitorType: "human",
    isEngagedSession: true,
    leadName: opts.name.slice(0, NAME_MAX) || undefined,
    leadEmail: opts.email?.slice(0, EMAIL_MAX) || undefined,
    leadPhone: opts.phone || undefined,
    leadSource: opts.source,
    analyticsVersion: ANALYTICS_DATA_VERSION,
  };

  if (isPopup) {
    sessionPatch.hasLeadCapture = true;
    sessionPatch.interestedItem = opts.interestedItem.slice(0, ITEM_MAX) || undefined;
  } else {
    sessionPatch.hasBookingIntent = true;
    sessionPatch.interestedItem = opts.interestedItem.slice(0, ITEM_MAX) || undefined;
  }

  await sessionRef.set(sessionPatch, { merge: true });

  if (alreadyLinked) return;

  const clickLabel = isPopup ? "Visitor lead popup" : "Booking form lead";
  const clickCategory = isPopup ? "popup_lead" : "booking_lead";
  const pageLabel = isPopup
    ? opts.interestedItem
      ? `Lead capture: ${opts.interestedItem.slice(0, 80)}`
      : "Visitor lead popup"
    : opts.interestedItem
      ? `Booking intent: ${opts.interestedItem.slice(0, 80)}`
      : "Booking form";

  await db.collection("pageViews").add({
    path: opts.path,
    sessionId,
    eventType: "click",
    clickLabel,
    clickCategory,
    pageLabel,
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
    email?: string;
    interestedItem?: string;
    preferredDate?: string;
    sessionId?: string;
    source?: string;
    capturePath?: string;
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
  const email = cleanEmail(body.email);
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
  const capturePath =
    typeof body.capturePath === "string"
      ? body.capturePath.trim().slice(0, PATH_MAX)
      : "";

  const analyticsPath =
    source === "visitor_popup"
      ? capturePath || "/"
      : "/booking";

  if (source === "visitor_popup" && !email) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  try {
    const ref = db.collection("marketingLeads").doc(phone);
    await ref.set(
      {
        phone,
        name,
        email: email || undefined,
        interestedItem,
        preferredDate,
        sessionId,
        source: source || "website",
        capturePath: capturePath || undefined,
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
        await markSessionAsHumanFromLead(db, sessionId, {
          name,
          email,
          phone,
          interestedItem,
          source: source || "website",
          path: analyticsPath,
        });
      } catch (e) {
        console.error("marketing lead analytics link failed", e);
      }
    }
    await upsertRecoveryLead({
      sessionId,
      phone,
      name,
      email,
      event: "whatsapp_click",
    });
  } catch (e) {
    console.error("marketing lead write failed", e);
    return NextResponse.json({ error: "Lead save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
