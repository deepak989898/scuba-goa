import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { istDayUtcBounds } from "@/lib/ai-analytics/ist";
import {
  resolveAdminVisitorKind,
  type AdminVisitorKind,
} from "@/lib/analytics-visitor-kind";
import type {
  InternalDailyMetrics,
  PageMetric,
  TrafficSourceMetric,
} from "@/lib/ai-analytics/types";

const PAGE_VIEWS_LIMIT = 12_000;
const SESSIONS_LIMIT = 4_000;
const FALLBACK_LIMIT = 8_000;

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

function toMillis(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "string") {
    const n = Date.parse(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    try {
      return (value as Timestamp).toMillis();
    } catch {
      return 0;
    }
  }
  return 0;
}

function inDay(ms: number, startMs: number, endMs: number): boolean {
  return ms >= startMs && ms <= endMs;
}

type SessionAgg = {
  kind: AdminVisitorKind;
  visitorType: string;
  pageViews: number;
  totalDurationMs: number;
  interactionCount: number;
  trafficChannel: string;
  trafficLabel: string;
  sourceConfidence: string;
  lastPath: string;
  lastEventType: string;
  deviceLabel: string;
  uaSnippet: string;
  analyticsVersion: number;
  visitedPaths: string[];
};

function sessionPageViewCount(data: Record<string, unknown>): number {
  return Math.max(
    0,
    Number(data.pageViewCount ?? data.pageViews ?? data.viewCount ?? 0) || 0,
  );
}

function sessionDurationMs(data: Record<string, unknown>): number {
  return Math.max(
    0,
    Number(
      data.engagedMs ?? data.totalDurationMs ?? data.durationMs ?? 0,
    ) || 0,
  );
}

function classifySession(data: Record<string, unknown>, pageViews: number): AdminVisitorKind {
  return resolveAdminVisitorKind({
    isBot: data.isBot === true,
    visitorType: String(data.visitorType ?? ""),
    uaSnippet: String(data.uaSnippet ?? data.userAgent ?? ""),
    deviceLabel: String(data.deviceLabel ?? ""),
    trafficChannel: String(data.trafficChannel ?? ""),
    sourceConfidence: String(data.sourceConfidence ?? ""),
    totalDurationMs: sessionDurationMs(data),
    pageViews: pageViews || sessionPageViewCount(data) || 1,
    interactionCount: Number(data.interactionCount ?? 0),
    analyticsVersion: Number(data.analyticsVersion ?? 1),
  });
}

export async function aggregateInternalDaily(
  dateIst: string,
): Promise<InternalDailyMetrics> {
  const db = getAdminDb();
  const empty: InternalDailyMetrics = {
    visitors: 0,
    visitorsHuman: 0,
    visitorsSuspected: 0,
    visitorsBot: 0,
    visitorsAll: 0,
    pageViews: 0,
    pageViewsAll: 0,
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
  const startMs = start.getTime();
  const endMs = end.getTime();
  const startTs = Timestamp.fromDate(start);
  const endTs = Timestamp.fromDate(end);

  const [viewsSnap, sessionsByFirst, sessionsByLast, bookingsSnap, paymentSnap] =
    await Promise.all([
      db
        .collection("pageViews")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .orderBy("createdAt", "desc")
        .limit(PAGE_VIEWS_LIMIT)
        .get()
        .catch(async (err) => {
          console.error("[ai-analytics] pageViews range query failed", err);
          const recent = await db
            .collection("pageViews")
            .orderBy("createdAt", "desc")
            .limit(FALLBACK_LIMIT)
            .get()
            .catch((e2) => {
              console.error("[ai-analytics] pageViews fallback failed", e2);
              return null;
            });
          return recent;
        }),
      db
        .collection("analyticsSessions")
        .where("firstSeenAt", ">=", startTs)
        .where("firstSeenAt", "<=", endTs)
        .orderBy("firstSeenAt", "desc")
        .limit(SESSIONS_LIMIT)
        .get()
        .catch(async (err) => {
          console.error("[ai-analytics] sessions firstSeenAt query failed", err);
          // Same fallback as lastSeen — filter by inDay below
          const recent = await db
            .collection("analyticsSessions")
            .orderBy("lastSeenAt", "desc")
            .limit(FALLBACK_LIMIT)
            .get()
            .catch((e2) => {
              console.error("[ai-analytics] sessions firstSeen fallback failed", e2);
              return null;
            });
          return recent;
        }),
      db
        .collection("analyticsSessions")
        .where("lastSeenAt", ">=", startTs)
        .where("lastSeenAt", "<=", endTs)
        .orderBy("lastSeenAt", "desc")
        .limit(SESSIONS_LIMIT)
        .get()
        .catch(async (err) => {
          console.error("[ai-analytics] sessions lastSeenAt query failed", err);
          const recent = await db
            .collection("analyticsSessions")
            .orderBy("lastSeenAt", "desc")
            .limit(FALLBACK_LIMIT)
            .get()
            .catch((e2) => {
              console.error("[ai-analytics] sessions fallback failed", e2);
              return null;
            });
          return recent;
        }),
      db
        .collection("bookings")
        .where("createdAt", ">=", start.toISOString())
        .where("createdAt", "<=", end.toISOString())
        .get()
        .catch(async (err) => {
          console.error("[ai-analytics] bookings ISO query failed", err);
          // Try Timestamp range, then recent scan
          try {
            return await db
              .collection("bookings")
              .where("createdAt", ">=", startTs)
              .where("createdAt", "<=", endTs)
              .get();
          } catch (eTs) {
            console.error("[ai-analytics] bookings Timestamp query failed", eTs);
            return db
              .collection("bookings")
              .orderBy("createdAt", "desc")
              .limit(500)
              .get()
              .catch((e2) => {
                console.error("[ai-analytics] bookings fallback failed", e2);
                return null;
              });
          }
        }),
      db
        .collection("paymentEvents")
        .where("createdAt", ">=", startTs)
        .where("createdAt", "<=", endTs)
        .get()
        .catch((err) => {
          console.error("[ai-analytics] paymentEvents query failed", err);
          return null;
        }),
    ]);

  const sessionMap = new Map<string, SessionAgg>();

  function upsertSession(id: string, data: Record<string, unknown>, viewsHint = 0) {
    if (!id) return;
    const existing = sessionMap.get(id);
    const pageViews = Math.max(
      viewsHint,
      sessionPageViewCount(data),
      existing?.pageViews ?? 0,
    );
    const visitorType = String(
      data.visitorType ?? existing?.visitorType ?? "",
    );
    const kind = classifySession({ ...data, visitorType }, pageViews || 1);
    const channel = String(data.trafficChannel ?? existing?.trafficChannel ?? "direct");
    const confidence = String(
      data.sourceConfidence ?? existing?.sourceConfidence ?? "",
    );
    const label =
      channel === "google_organic" && confidence && confidence !== "high"
        ? "Unknown / low-confidence"
        : String(data.trafficLabel ?? existing?.trafficLabel ?? channel);

    const visitedFromData = Array.isArray(data.visitedPaths)
      ? data.visitedPaths.map((p) => String(p)).filter(Boolean)
      : [];
    const lastPath = String(
      data.lastPath ?? existing?.lastPath ?? data.path ?? "",
    );
    const landingPath = String(data.landingPath ?? "");
    const eventPath = String(data.path ?? "");
    const visitedPaths = [
      ...new Set([
        ...(existing?.visitedPaths ?? []),
        ...visitedFromData,
        ...(lastPath ? [lastPath] : []),
        ...(landingPath ? [landingPath] : []),
        ...(eventPath ? [eventPath] : []),
      ]),
    ];

    sessionMap.set(id, {
      kind,
      visitorType,
      pageViews: pageViews || 1,
      totalDurationMs: Math.max(
        sessionDurationMs(data),
        existing?.totalDurationMs ?? 0,
      ),
      interactionCount: Math.max(
        Number(data.interactionCount ?? 0),
        existing?.interactionCount ?? 0,
      ),
      trafficChannel: channel,
      trafficLabel: label,
      sourceConfidence: confidence,
      lastPath,
      lastEventType: String(data.lastEventType ?? existing?.lastEventType ?? ""),
      deviceLabel: String(data.deviceLabel ?? existing?.deviceLabel ?? ""),
      uaSnippet: String(
        data.uaSnippet ?? data.userAgent ?? existing?.uaSnippet ?? "",
      ),
      analyticsVersion: Number(
        data.analyticsVersion ?? existing?.analyticsVersion ?? 1,
      ),
      visitedPaths,
    });
  }

  for (const snap of [sessionsByFirst, sessionsByLast]) {
    if (!snap) continue;
    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const firstMs = toMillis(data.firstSeenAt);
      const lastMs = toMillis(data.lastSeenAt);
      // Keep sessions that started on this IST day (primary) or were only seen that day
      if (
        !inDay(firstMs, startMs, endMs) &&
        !inDay(lastMs, startMs, endMs)
      ) {
        continue;
      }
      // Prefer first-seen day for visitor attribution (match Site analytics)
      if (firstMs > 0 && !inDay(firstMs, startMs, endMs) && inDay(lastMs, startMs, endMs)) {
        // Session started another day — still include for traffic continuity only if
        // it has views today; visitor count uses firstSeen. Skip for visitor totals.
        continue;
      }
      upsertSession(doc.id, data);
    }
  }

  const pageViewCounts = new Map<string, number>();
  const exitCounts = new Map<string, number>();
  const sessionPageCounts = new Map<string, number>();
  let pageViewsHuman = 0;
  let pageViewsAll = 0;
  let whatsappClicks = 0;
  let phoneClicks = 0;
  let bookingPageViews = 0;
  let totalDwellSec = 0;
  let dwellSamples = 0;

  if (viewsSnap) {
    for (const doc of viewsSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const createdMs = toMillis(data.createdAt);
      if (createdMs && !inDay(createdMs, startMs, endMs)) continue;

      const sid = String(data.sessionId ?? "");
      // Legacy rows often omit eventType — treat blank as a page view (Site analytics parity)
      const rawType = String(data.eventType ?? "").trim();
      const eventType =
        !rawType || rawType === "view"
          ? "view"
          : rawType;
      // Skip heartbeats/scrolls from page-view tallies; clicks/leaves handled below
      const path = String(data.path ?? "/");

      // Ensure every session seen in pageViews is classified
      if (sid && !sessionMap.has(sid)) {
        upsertSession(sid, data, eventType === "view" ? 1 : 0);
      }

      const kind = sid ? sessionMap.get(sid)?.kind : classifySession(data, 1);
      const isHumanish = kind === "human" || kind === "unknown";

      if (eventType === "view") {
        pageViewsAll += 1;
        if (isHumanish) {
          pageViewsHuman += 1;
          pageViewCounts.set(path, (pageViewCounts.get(path) ?? 0) + 1);
          if (path === "/booking" || path.startsWith("/booking")) {
            bookingPageViews += 1;
          }
        }
        if (sid) {
          sessionPageCounts.set(sid, (sessionPageCounts.get(sid) ?? 0) + 1);
          const cur = sessionMap.get(sid);
          if (cur) {
            cur.pageViews = Math.max(cur.pageViews, sessionPageCounts.get(sid) ?? 0);
            cur.kind = resolveAdminVisitorKind({
              visitorType: cur.visitorType,
              uaSnippet: cur.uaSnippet,
              deviceLabel: cur.deviceLabel,
              trafficChannel: cur.trafficChannel,
              sourceConfidence: cur.sourceConfidence,
              totalDurationMs: cur.totalDurationMs,
              pageViews: cur.pageViews,
              interactionCount: cur.interactionCount,
              analyticsVersion: cur.analyticsVersion,
            });
          }
        }
      } else if (eventType === "leave") {
        if (isHumanish) exitCounts.set(path, (exitCounts.get(path) ?? 0) + 1);
        const ms = Number(data.durationMs ?? 0);
        if (isHumanish && Number.isFinite(ms) && ms > 0) {
          totalDwellSec += ms / 1000;
          dwellSamples += 1;
        }
      } else if (eventType === "click" && isHumanish) {
        if (isWhatsAppClick(data)) whatsappClicks += 1;
        if (isPhoneClick(data)) phoneClicks += 1;
      }
      // heartbeat / scroll / other — ignore for counts
    }
  }

  let visitorsHuman = 0;
  let visitorsSuspected = 0;
  let visitorsBot = 0;
  let visitorsInternal = 0;
  let bounceSessions = 0;
  const sourceCounts = new Map<string, TrafficSourceMetric>();

  for (const [sid, s] of sessionMap) {
    if (s.kind === "human" || s.kind === "unknown") {
      visitorsHuman += 1;
      const views = sessionPageCounts.get(sid) ?? s.pageViews;
      if (views <= 1) bounceSessions += 1;
      const key = `${s.trafficChannel}::${s.trafficLabel}`;
      const cur = sourceCounts.get(key) ?? {
        channel: s.trafficChannel,
        label: s.trafficLabel,
        sessions: 0,
      };
      cur.sessions += 1;
      sourceCounts.set(key, cur);
    } else if (s.kind === "suspected") {
      visitorsSuspected += 1;
    } else if (s.kind === "bot") {
      visitorsBot += 1;
    } else if (s.kind === "internal") {
      visitorsInternal += 1;
    }
  }

  const visitorsAll =
    visitorsHuman + visitorsSuspected + visitorsBot + visitorsInternal;
  const visitors = visitorsHuman;

  let paymentSuccess = 0;
  let paymentFailed = 0;
  let paymentDismissed = 0;
  let verifyFailed = 0;

  if (paymentSnap) {
    for (const doc of paymentSnap.docs) {
      const createdMs = toMillis(doc.data().createdAt);
      if (createdMs && !inDay(createdMs, startMs, endMs)) continue;
      const t = String(doc.data().eventType ?? "");
      if (t === "payment_success") paymentSuccess += 1;
      else if (t === "payment_failed") paymentFailed += 1;
      else if (t === "checkout_dismissed") paymentDismissed += 1;
      else if (t === "verify_failed") verifyFailed += 1;
    }
  }

  let bookingsPaid = 0;
  let bookingRevenueInr = 0;
  if (bookingsSnap) {
    for (const doc of bookingsSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const createdMs = toMillis(data.createdAt);
      if (createdMs && !inDay(createdMs, startMs, endMs)) continue;
      if (data.status !== "paid") continue;
      bookingsPaid += 1;
      const paise = Number(data.amountPaise ?? 0);
      if (Number.isFinite(paise)) bookingRevenueInr += paise / 100;
    }
  }

  const bookingConversionRatePct =
    visitors > 0 ? Math.round((bookingsPaid / visitors) * 10000) / 100 : 0;
  const bounceRatePct =
    visitors > 0 ? Math.round((bounceSessions / visitors) * 10000) / 100 : 0;
  const avgSessionDurationSec =
    dwellSamples > 0 ? Math.round(totalDwellSec / dwellSamples) : 0;

  // Fallback: when pageViews events are missing, use session paths so Top/Exit pages still show
  if (pageViewCounts.size === 0) {
    for (const [, s] of sessionMap) {
      if (s.kind !== "human" && s.kind !== "unknown") continue;
      const paths =
        s.visitedPaths.length > 0
          ? s.visitedPaths
          : s.lastPath
            ? [s.lastPath]
            : [];
      for (const path of paths) {
        if (!path) continue;
        pageViewCounts.set(path, (pageViewCounts.get(path) ?? 0) + 1);
      }
    }
  }
  if (exitCounts.size === 0) {
    for (const [, s] of sessionMap) {
      if (s.kind !== "human" && s.kind !== "unknown") continue;
      const path = s.lastPath || s.visitedPaths[s.visitedPaths.length - 1] || "";
      if (!path) continue;
      exitCounts.set(path, (exitCounts.get(path) ?? 0) + 1);
    }
  }

  // Prefer real view counts; if still empty after fallback, keep empty arrays
  let pageViewsOut = pageViewsHuman;
  if (pageViewsOut === 0 && pageViewCounts.size > 0) {
    pageViewsOut = [...pageViewCounts.values()].reduce((a, b) => a + b, 0);
  }

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
    visitorsHuman,
    visitorsSuspected,
    visitorsBot,
    visitorsAll,
    pageViews: pageViewsOut,
    pageViewsAll: Math.max(pageViewsAll, pageViewsOut),
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
