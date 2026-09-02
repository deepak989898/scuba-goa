import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import type {
  BookWithUsChatDaySummary,
  BookWithUsChatMessage,
  BookWithUsChatSession,
} from "./session-log-types";

export function istActivityDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  } catch {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  }
}

export function formatDayLabel(dateKey: string): string {
  try {
    const d = new Date(`${dateKey}T12:00:00`);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateKey;
  }
}

function sessionDocId(sessionId: string): string {
  const safe = sessionId.trim().slice(0, 120).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `chat_${safe}`;
}

export async function upsertBookWithUsChatSession(input: {
  sessionId: string;
  language: string;
  messages: BookWithUsChatMessage[];
  step: string;
  tripDate?: string;
  people?: number;
  pickup?: string;
  selectedPackages?: string[];
  customerName?: string;
  phone?: string;
  email?: string;
  cartTotalInr?: number;
  paidInr?: number;
  converted?: boolean;
  paymentId?: string;
}): Promise<void> {
  const db = getAdminDb();
  if (!db || !input.sessionId.trim()) return;

  const now = new Date().toISOString();
  const id = sessionDocId(input.sessionId);
  const ref = db.collection("bookWithUsChatSessions").doc(id);
  const snap = await ref.get();
  const prev = snap.exists ? (snap.data() as BookWithUsChatSession) : null;

  const messages = input.messages.slice(-80).map((m) => ({
    role: m.role,
    text: String(m.text).slice(0, 4000),
    at: m.at || now,
    step: m.step,
  }));

  const row: BookWithUsChatSession = {
    id,
    sessionId: input.sessionId.trim(),
    language: input.language || prev?.language || "English",
    messages,
    step: input.step || prev?.step || "welcome",
    tripDate: input.tripDate || prev?.tripDate,
    people: input.people ?? prev?.people,
    pickup: input.pickup || prev?.pickup,
    selectedPackages: input.selectedPackages ?? prev?.selectedPackages ?? [],
    customerName: input.customerName || prev?.customerName,
    phone: input.phone || prev?.phone,
    email: input.email || prev?.email,
    cartTotalInr: input.cartTotalInr ?? prev?.cartTotalInr,
    paidInr: input.paidInr ?? prev?.paidInr,
    converted: Boolean(input.converted ?? prev?.converted),
    paymentId: input.paymentId || prev?.paymentId,
    activityDate: istActivityDate(now),
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };

  await ref.set(stripUndefinedDeep(row), { merge: true });
}

export async function listChatDaysSummary(limitDays = 60): Promise<BookWithUsChatDaySummary[]> {
  const db = getAdminDb();
  if (!db) return [];

  const snap = await db.collection("bookWithUsChatSessions").limit(2000).get();
  const byDate = new Map<string, { count: number; converted: number }>();

  for (const doc of snap.docs) {
    const data = doc.data() as BookWithUsChatSession;
    const key = data.activityDate || istActivityDate(data.updatedAt || data.createdAt);
    const bucket = byDate.get(key) ?? { count: 0, converted: 0 };
    bucket.count += 1;
    if (data.converted) bucket.converted += 1;
    byDate.set(key, bucket);
  }

  return [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, limitDays)
    .map(([date, stats]) => ({
      date,
      label: formatDayLabel(date),
      sessionCount: stats.count,
      convertedCount: stats.converted,
    }));
}

export async function listChatSessionsForDate(
  dateKey: string,
): Promise<BookWithUsChatSession[]> {
  const db = getAdminDb();
  if (!db || !dateKey) return [];

  try {
    const snap = await db
      .collection("bookWithUsChatSessions")
      .where("activityDate", "==", dateKey)
      .get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as BookWithUsChatSession)
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  } catch {
    const snap = await db.collection("bookWithUsChatSessions").limit(2000).get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as BookWithUsChatSession)
      .filter(
        (s) =>
          (s.activityDate || istActivityDate(s.updatedAt)) === dateKey,
      )
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }
}
