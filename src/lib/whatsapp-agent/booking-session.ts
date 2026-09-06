import { getAdminDb } from "@/lib/firebase-admin";
import type { WhatsAppBookingSession } from "@/lib/whatsapp-agent/types";
import { DEFAULT_WHATSAPP_BOOKING_SESSION } from "@/lib/whatsapp-agent/types";

function sessionDocId(phone: string): string {
  return phone.replace(/\D/g, "").slice(-12);
}

export async function loadWhatsAppBookingSession(
  phone: string,
): Promise<WhatsAppBookingSession> {
  const db = getAdminDb();
  const id = sessionDocId(phone);
  if (!db || !id) return DEFAULT_WHATSAPP_BOOKING_SESSION(phone);
  const snap = await db.collection("whatsappBookingSessions").doc(id).get();
  if (!snap.exists) return DEFAULT_WHATSAPP_BOOKING_SESSION(phone);
  const data = snap.data() as WhatsAppBookingSession;
  return { ...DEFAULT_WHATSAPP_BOOKING_SESSION(phone), ...data, phone: id };
}

export async function saveWhatsAppBookingSession(
  session: WhatsAppBookingSession,
): Promise<void> {
  const db = getAdminDb();
  const id = sessionDocId(session.phone);
  if (!db || !id) return;
  const now = new Date().toISOString();
  await db
    .collection("whatsappBookingSessions")
    .doc(id)
    .set({ ...session, phone: id, updatedAt: now }, { merge: true });
}

const BOOKING_KEYWORDS =
  /\b(book|booking|reserve|slot|package|scuba|dive|water\s*sport|price|rate|cost|kitna|book\s*karna|chalna|confirm)\b/i;

const HANDOFF_KEYWORDS =
  /\b(human|agent|call\s*me|real\s*person|manager|complaint|refund|stop\s*bot|stop\s*message)\b/i;

const DATE_PATTERNS = [
  /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/,
  /\b(tomorrow|today|kal|aaj)\b/i,
  /\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i,
];

function parsePeopleCount(text: string): number {
  const m = text.match(/\b(\d{1,2})\s*(people|person|pax|guests|log|members)?\b/i);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 30) return n;
  }
  const alone = text.match(/^\s*(\d{1,2})\s*$/);
  if (alone) {
    const n = Number(alone[1]);
    if (n >= 1 && n <= 30) return n;
  }
  return 0;
}

function parseDateHint(text: string): string {
  const lower = text.toLowerCase();
  if (/\btomorrow\b|\bkal\b/.test(lower)) return "tomorrow";
  if (/\btoday\b|\baaj\b/.test(lower)) return "today";
  const slash = text.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (slash) return slash[0];
  const month = text.match(
    /\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i,
  );
  if (month) return month[0];
  return "";
}

export function updateBookingSessionFromMessage(
  session: WhatsAppBookingSession,
  message: string,
  profileName?: string,
  handoffCooldownHours = 4,
): WhatsAppBookingSession {
  const next = { ...session };
  const text = message.trim();
  const now = new Date().toISOString();
  next.lastInboundAt = now;

  if (profileName && !next.customerName) {
    next.customerName = profileName.slice(0, 80);
  }

  if (HANDOFF_KEYWORDS.test(text)) {
    next.handoffUntil = new Date(
      Date.now() + handoffCooldownHours * 3600_000,
    ).toISOString();
    next.step = "idle";
    return next;
  }

  const wantsBooking = BOOKING_KEYWORDS.test(text) || next.step !== "idle";
  if (!wantsBooking) return next;

  if (next.step === "idle") {
    next.step = "collecting_date";
  }

  const dateHint = parseDateHint(text);
  if (dateHint && !next.preferredDate) {
    next.preferredDate = dateHint;
    if (next.step === "collecting_date") next.step = "collecting_people";
  }

  const people = parsePeopleCount(text);
  if (people > 0) {
    next.people = people;
    if (next.step === "collecting_people") next.step = "collecting_activity";
  }

  if (
    next.step === "collecting_activity" &&
    text.length > 3 &&
    !BOOKING_KEYWORDS.test(text) &&
    !dateHint &&
    !people
  ) {
    next.activityInterest = text.slice(0, 200);
    next.step = "ready_to_book";
  }

  if (
    next.preferredDate &&
    next.people > 0 &&
    next.activityInterest &&
    next.step !== "ready_to_book"
  ) {
    next.step = "ready_to_book";
  }

  return next;
}

export function bookingSessionSummary(session: WhatsAppBookingSession): string {
  const parts: string[] = [];
  if (session.customerName) parts.push(`Name: ${session.customerName}`);
  if (session.preferredDate) parts.push(`Date: ${session.preferredDate}`);
  if (session.people > 0) parts.push(`People: ${session.people}`);
  if (session.activityInterest) parts.push(`Interest: ${session.activityInterest}`);
  parts.push(`Step: ${session.step}`);
  return parts.join(" | ") || "No booking details yet";
}

export function isHandoffActive(session: WhatsAppBookingSession): boolean {
  if (!session.handoffUntil) return false;
  return new Date(session.handoffUntil).getTime() > Date.now();
}
