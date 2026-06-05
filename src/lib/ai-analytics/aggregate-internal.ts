import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { istDayUtcBounds } from "@/lib/ai-analytics/ist";
import type {
  InternalDailyMetrics,
  PageMetric,
  TrafficSourceMetric,
} from "@/lib/ai-analytics/types";

const PAGE_VIEWS_LIMIT = 12_000;
const SESSIONS_LIMIT = 4_000;

function isWhatsAppClick(data: Record<string, unknown>): boolean {
  const href = String(data.clickHref ?? "").toLowerCase();
  const label = String(data.clickLabel ?? "").toLowerCase();
  return href.includes("wa.me") || label.includes("whatsapp");
}

function isPhoneClick(data: Record<string, unknown>): boolean {
  const href = String(data.clickHref ?? "").toLowerCase();
  const label = String(data.clickLabel ?? "").toLowerCase();
  return href.startsWith("tel:") || label.includes("call");
}

export async function aggregateInternalDaily(
  dateIst: string,
): Promise<InternalDailyMetrics> {
  const db = getAdminDb();
  const empty: InternalDailyMetrics = {
    visitors: 0,
    pageViews: 0,
    bounceRatePct: 0,
    avgSessionDurationSec: 0,
    bookingsPaid: 0,
    bookingRevenueInr: 0,
    bookingConversionRatePct: 0,
    whatsappClicks: 0,
    phoneClicks: 0,
    bookingPageViews: 0,
    paymentSuccess: 0,
    paymentFailed: 0,
    paymentDismissed: 0,
    verifyFailed: 0,
    topPages: [],
    exitPages: [],
    trafficSources: [],
  };
  if (!db) return empty;

  const { start, end } = istDayUtcBounds(dateIst);
  const startTs = Timestamp.fromDate(start);
  const endTs = Timestamp.fromDate(end);

  const [viewsSnap, sessionsSnap, bookingsSnap, paymentSnap] = await Promise.all([
    db
      .collection("pageViews")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .orderBy("createdAt", "desc")
      .limit(PAGE_VIEWS_LIMIT)
      .get()
      .catch(() => null),
    db
      .collection("analyticsSessions")
      .where("lastSeenAt", ">=", startTs)
      .where("lastSeenAt", "<=", endTs)
      .orderBy("lastSeenAt", "desc")
      .limit(SESSIONS_LIMIT)
      .get()
      .catch(() => null),
    db
      .collection("bookings")
      .where("createdAt", ">=", start.toISOString())
      .where("createdAt", "<=", end.toISOString())
      .get()
      .catch(() => null),
    db
      .collection("paymentEvents")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .get()
      .catch(() => null),
  ]);

  const pageViewCounts = new Map<string, number>();
  const exitCounts = new Map<string, number>();
  const sessionIds = new Set<string>();
  let pageViews = 0;
  let whatsappClicks = 0;
  let phoneClicks = 0;
  let bookingPageViews = 0;

  if (viewsSnap) {
    for (const doc of viewsSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (data.isBot === true) continue;
      const eventType = String(data.eventType ?? "");
      const path = String(data.path ?? "/");
      const sid = String(data.sessionId ?? "");

      if (eventType === "view") {
        pageViews += 1;
        if (sid) sessionIds.add(sid);
        pageViewCounts.set(path, (pageViewCounts.get(path) ?? 0) + 1);
        if (path === "/booking" || path.startsWith("/booking")) {
          bookingPageViews += 1;
        }
      }
      if (eventType === "leave") {
        exitCounts.set(path, (exitCounts.get(path) ?? 0) + 1);
      }
      if (eventType === "click") {
        if (isWhatsAppClick(data)) whatsappClicks += 1;
        if (isPhoneClick(data)) phoneClicks += 1;
      }
    }
  }

  let paymentSuccess = 0;
  let paymentFailed = 0;
  let paymentDismissed = 0;
  let verifyFailed = 0;
  let checkoutStarts = 0;

  if (paymentSnap) {
    for (const doc of paymentSnap.docs) {
      const t = String(doc.data().eventType ?? "");
      if (t === "payment_success") paymentSuccess += 1;
      else if (t === "payment_failed") paymentFailed += 1;
      else if (t === "checkout_dismissed") paymentDismissed += 1;
      else if (t === "verify_failed") verifyFailed += 1;
      else if (t === "checkout_started") checkoutStarts += 1;
    }
  }

  let bookingsPaid = 0;
  let bookingRevenueInr = 0;
  if (bookingsSnap) {
    for (const doc of bookingsSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (data.status !== "paid") continue;
      bookingsPaid += 1;
      const paise = Number(data.amountPaise ?? 0);
      if (Number.isFinite(paise)) bookingRevenueInr += paise / 100;
    }
  }

  const visitors = sessionIds.size;
  const bookingConversionRatePct =
    visitors > 0 ? Math.round((bookingsPaid / visitors) * 10000) / 100 : 0;

  let bounceSessions = 0;
  let totalDwellSec = 0;
  let dwellSamples = 0;
  const sourceCounts = new Map<string, TrafficSourceMetric>();

  if (sessionsSnap) {
    for (const doc of sessionsSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (data.isBot === true) continue;
      const lastPath = String(data.lastPath ?? "");
      const lastEvent = String(data.lastEventType ?? "");
      if (lastEvent === "view" && lastPath) {
        bounceSessions += 1;
      }
      const channel = String(data.trafficChannel ?? "direct");
      const label = String(data.trafficLabel ?? channel);
      const key = `${channel}::${label}`;
      const cur = sourceCounts.get(key) ?? { channel, label, sessions: 0 };
      cur.sessions += 1;
      sourceCounts.set(key, cur);
    }
  }

  if (viewsSnap) {
    const sessionPageCounts = new Map<string, number>();
    for (const doc of viewsSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (data.eventType !== "view" || data.isBot === true) continue;
      const sid = String(data.sessionId ?? "");
      if (!sid) continue;
      sessionPageCounts.set(sid, (sessionPageCounts.get(sid) ?? 0) + 1);
    }
    bounceSessions = 0;
    for (const count of sessionPageCounts.values()) {
      if (count <= 1) bounceSessions += 1;
    }

    for (const doc of viewsSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (data.eventType !== "leave" || data.isBot === true) continue;
      const ms = Number(data.durationMs ?? 0);
      if (Number.isFinite(ms) && ms > 0) {
        totalDwellSec += ms / 1000;
        dwellSamples += 1;
      }
    }
  }

  const bounceRatePct =
    visitors > 0 ? Math.round((bounceSessions / visitors) * 10000) / 100 : 0;
  const avgSessionDurationSec =
    dwellSamples > 0 ? Math.round(totalDwellSec / dwellSamples) : 0;

  const topPages: PageMetric[] = [...pageViewCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([path, views]) => ({ path, views }));

  const exitPages: PageMetric[] = [...exitCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }));

  const trafficSources = [...sourceCounts.values()]
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  return {
    visitors,
    pageViews,
    bounceRatePct,
    avgSessionDurationSec,
    bookingsPaid,
    bookingRevenueInr: Math.round(bookingRevenueInr),
    bookingConversionRatePct,
    whatsappClicks,
    phoneClicks,
    bookingPageViews,
    paymentSuccess: paymentSuccess || bookingsPaid,
    paymentFailed,
    paymentDismissed,
    verifyFailed,
    topPages,
    exitPages,
    trafficSources,
  };
}
