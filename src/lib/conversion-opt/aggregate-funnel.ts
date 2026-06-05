import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { istDayUtcBounds } from "@/lib/ai-analytics/ist";
import type {
  ConversionOptDailyDoc,
  FunnelStep,
  PagePerformance,
} from "@/lib/conversion-opt/types";

const PAGE_VIEWS_LIMIT = 15_000;

type SessionAgg = {
  landingPath: string;
  paths: Set<string>;
  maxScroll: number;
  hasCta: boolean;
  hasBookingPage: boolean;
  isMobile: boolean;
  bounced: boolean;
  pageStats: Map<
    string,
    { dwellMs: number; scrollPct: number; exits: number; views: number }
  >;
  bookClicks: number;
  waClicks: number;
};

function isMobileDevice(cat: string, vw: number | null): boolean {
  if (cat === "mobile") return true;
  return vw != null && vw > 0 && vw < 768;
}

export async function aggregateConversionFunnel(
  dateIst: string,
): Promise<ConversionOptDailyDoc> {
  const db = getAdminDb();
  const empty = emptyDoc(dateIst);
  if (!db) return empty;

  const { start, end } = istDayUtcBounds(dateIst);
  const startTs = Timestamp.fromDate(start);
  const endTs = Timestamp.fromDate(end);

  const [viewsSnap, paymentSnap] = await Promise.all([
    db
      .collection("pageViews")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .orderBy("createdAt", "desc")
      .limit(PAGE_VIEWS_LIMIT)
      .get()
      .catch(() => null),
    db
      .collection("paymentEvents")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs)
      .get()
      .catch(() => null),
  ]);

  const sessions = new Map<string, SessionAgg>();
  const landingCounts = new Map<string, number>();

  let checkoutStarted = 0;
  let paymentSuccess = 0;
  let paymentFailed = 0;
  let paymentDismissed = 0;
  let verifyFailed = 0;

  if (paymentSnap) {
    for (const doc of paymentSnap.docs) {
      const t = String(doc.data().eventType ?? "");
      if (t === "checkout_started") checkoutStarted += 1;
      else if (t === "payment_success") paymentSuccess += 1;
      else if (t === "payment_failed") paymentFailed += 1;
      else if (t === "checkout_dismissed") paymentDismissed += 1;
      else if (t === "verify_failed") verifyFailed += 1;
    }
  }

  if (viewsSnap) {
    for (const doc of viewsSnap.docs) {
      const d = doc.data() as Record<string, unknown>;
      if (d.isBot === true) continue;

      const sid = String(d.sessionId ?? "anon");
      const eventType = String(d.eventType ?? "");
      const path = String(d.path ?? "/");
      const landing = String(d.landingPath ?? path);
      const cat = String(d.clickCategory ?? "");
      const deviceCat = String(d.deviceCategory ?? "");
      const vw = typeof d.viewportWidth === "number" ? d.viewportWidth : null;

      let s = sessions.get(sid);
      if (!s) {
        s = {
          landingPath: landing || path,
          paths: new Set(),
          maxScroll: 0,
          hasCta: false,
          hasBookingPage: false,
          isMobile: isMobileDevice(deviceCat, vw),
          bounced: true,
          pageStats: new Map(),
          bookClicks: 0,
          waClicks: 0,
        };
        sessions.set(sid, s);
        const lp = s.landingPath || "/";
        landingCounts.set(lp, (landingCounts.get(lp) ?? 0) + 1);
      }

      if (eventType === "view") {
        s.paths.add(path);
        if (path === "/booking" || path.startsWith("/booking")) {
          s.hasBookingPage = true;
        }
        const ps = s.pageStats.get(path) ?? {
          dwellMs: 0,
          scrollPct: 0,
          exits: 0,
          views: 0,
        };
        ps.views += 1;
        s.pageStats.set(path, ps);
      }

      if (eventType === "scroll") {
        const pct = Number(d.scrollDepthPct ?? 0);
        if (pct > s.maxScroll) s.maxScroll = pct;
        const ps = s.pageStats.get(path) ?? {
          dwellMs: 0,
          scrollPct: 0,
          exits: 0,
          views: 0,
        };
        if (pct > ps.scrollPct) ps.scrollPct = pct;
        s.pageStats.set(path, ps);
      }

      if (eventType === "click") {
        if (cat === "book_cta" || cat === "service_cta") {
          s.hasCta = true;
          s.bookClicks += 1;
        }
        if (cat === "whatsapp") {
          s.hasCta = true;
          s.waClicks += 1;
        }
      }

      if (eventType === "leave") {
        const dur = Number(d.durationMs ?? 0);
        if (dur >= 8000) s.bounced = false;
        const ps = s.pageStats.get(path) ?? {
          dwellMs: 0,
          scrollPct: 0,
          exits: 0,
          views: 0,
        };
        ps.exits += 1;
        ps.dwellMs += dur;
        const maxScroll = Number(d.maxScrollDepthPct ?? 0);
        if (maxScroll > ps.scrollPct) ps.scrollPct = maxScroll;
        s.pageStats.set(path, ps);
      }
    }
  }

  const sessionList = [...sessions.values()];
  const totalSessions = sessionList.length;
  const engagedScroll = sessionList.filter((s) => s.maxScroll >= 50).length;
  const ctaSessions = sessionList.filter((s) => s.hasCta).length;
  const bookingPageSessions = sessionList.filter((s) => s.hasBookingPage).length;
  const paidSessions = paymentSuccess;

  const funnel = buildFunnelSteps({
    sessions: totalSessions,
    engagedScroll,
    ctaSessions,
    bookingPageSessions,
    checkoutStarted,
    paymentSuccess: paidSessions,
  });

  const pathAgg = new Map<
    string,
    {
      views: number;
      exits: number;
      dwellTotal: number;
      dwellCount: number;
      scrollTotal: number;
      scrollCount: number;
      bookClicks: number;
      waClicks: number;
      toBooking: number;
    }
  >();

  for (const s of sessionList) {
    const wentBooking = s.hasBookingPage;
    for (const [path, ps] of s.pageStats) {
      const cur = pathAgg.get(path) ?? {
        views: 0,
        exits: 0,
        dwellTotal: 0,
        dwellCount: 0,
        scrollTotal: 0,
        scrollCount: 0,
        bookClicks: 0,
        waClicks: 0,
        toBooking: 0,
      };
      cur.views += ps.views;
      cur.exits += ps.exits;
      if (ps.dwellMs > 0) {
        cur.dwellTotal += ps.dwellMs;
        cur.dwellCount += 1;
      }
      if (ps.scrollPct > 0) {
        cur.scrollTotal += ps.scrollPct;
        cur.scrollCount += 1;
      }
      if (wentBooking) cur.toBooking += 1;
      pathAgg.set(path, cur);
    }
    for (const p of s.paths) {
      if (s.bookClicks > 0 && p !== "/booking") {
        const cur = pathAgg.get(p);
        if (cur) cur.bookClicks += 1;
      }
      if (s.waClicks > 0) {
        const cur = pathAgg.get(p);
        if (cur) cur.waClicks += 1;
      }
    }
  }

  const pages: PagePerformance[] = [...pathAgg.entries()]
    .filter(([p]) => p && !p.startsWith("/admin"))
    .map(([path, a]) => {
      const avgDwellSec =
        a.dwellCount > 0 ? Math.round(a.dwellTotal / a.dwellCount / 1000) : 0;
      const avgScrollPct =
        a.scrollCount > 0 ? Math.round(a.scrollTotal / a.scrollCount) : 0;
      const bookingPageRatePct =
        a.views > 0 ? Math.round((a.toBooking / a.views) * 100) : 0;
      let score: PagePerformance["score"] = "medium";
      if (a.views >= 10 && bookingPageRatePct >= 8 && avgDwellSec >= 20) {
        score = "high";
      } else if (a.views >= 10 && (avgDwellSec < 8 || bookingPageRatePct < 2)) {
        score = "low";
      }
      return {
        path,
        views: a.views,
        exits: a.exits,
        avgDwellSec,
        avgScrollPct,
        bookCtaClicks: a.bookClicks,
        whatsappClicks: a.waClicks,
        bookingPageRatePct,
        score,
      };
    });

  const topPerforming = [...pages]
    .filter((p) => p.views >= 3)
    .sort((a, b) => b.bookingPageRatePct - a.bookingPageRatePct || b.views - a.views)
    .slice(0, 8);

  const lowPerforming = [...pages]
    .filter((p) => p.views >= 5 && p.score === "low")
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  const mobileSessions = sessionList.filter((s) => s.isMobile).length;
  const mobileBounced = sessionList.filter((s) => s.isMobile && s.bounced).length;
  const mobileBouncePct =
    mobileSessions > 0 ? Math.round((mobileBounced / mobileSessions) * 100) : 0;

  let waTotal = 0;
  let bookCtaTotal = 0;
  let phoneTotal = 0;
  if (viewsSnap) {
    for (const doc of viewsSnap.docs) {
      const d = doc.data() as Record<string, unknown>;
      if (d.eventType !== "click" || d.isBot === true) continue;
      const cat = String(d.clickCategory ?? "");
      if (cat === "whatsapp") waTotal += 1;
      if (cat === "book_cta" || cat === "service_cta") bookCtaTotal += 1;
      if (cat === "phone") phoneTotal += 1;
    }
  }

  const topLandingPages = [...landingCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, sessions]) => ({ path, sessions }));

  return {
    dateIst,
    generatedAt: new Date().toISOString(),
    funnel,
    topLandingPages,
    topPerformingPages: topPerforming,
    lowPerformingPages: lowPerforming,
    issues: [],
    journeyTotals: {
      whatsappClicks: waTotal,
      phoneClicks: phoneTotal,
      bookCtaClicks: bookCtaTotal,
      checkoutStarted,
      paymentFailed,
      paymentDismissed,
      verifyFailed,
      mobileSessions,
      mobileBouncePct,
    },
  };
}

function buildFunnelSteps(counts: {
  sessions: number;
  engagedScroll: number;
  ctaSessions: number;
  bookingPageSessions: number;
  checkoutStarted: number;
  paymentSuccess: number;
}): FunnelStep[] {
  const steps: { id: FunnelStep["id"]; label: string; count: number }[] = [
    { id: "sessions", label: "Site visitors", count: counts.sessions },
    { id: "engaged_scroll", label: "Scrolled 50%+", count: counts.engagedScroll },
    { id: "cta_click", label: "Clicked CTA / WhatsApp", count: counts.ctaSessions },
    { id: "booking_page", label: "Opened booking page", count: counts.bookingPageSessions },
    { id: "checkout_started", label: "Started checkout", count: counts.checkoutStarted },
    { id: "payment_success", label: "Paid booking", count: counts.paymentSuccess },
  ];

  return steps.map((step, i) => {
    const prev = i > 0 ? steps[i - 1].count : step.count;
    const drop = Math.max(0, prev - step.count);
    const dropPct = prev > 0 ? Math.round((drop / prev) * 100) : 0;
    return {
      ...step,
      dropOffFromPrev: i > 0 ? drop : undefined,
      dropOffPct: i > 0 ? dropPct : undefined,
    };
  });
}

function emptyDoc(dateIst: string): ConversionOptDailyDoc {
  return {
    dateIst,
    generatedAt: new Date().toISOString(),
    funnel: buildFunnelSteps({
      sessions: 0,
      engagedScroll: 0,
      ctaSessions: 0,
      bookingPageSessions: 0,
      checkoutStarted: 0,
      paymentSuccess: 0,
    }),
    topLandingPages: [],
    topPerformingPages: [],
    lowPerformingPages: [],
    issues: [],
    journeyTotals: {
      whatsappClicks: 0,
      phoneClicks: 0,
      bookCtaClicks: 0,
      checkoutStarted: 0,
      paymentFailed: 0,
      paymentDismissed: 0,
      verifyFailed: 0,
      mobileSessions: 0,
      mobileBouncePct: 0,
    },
  };
}
