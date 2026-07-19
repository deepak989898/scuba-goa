import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { parseRequestDevice } from "@/lib/clientDevice";
import { geoFromRequestHeaders } from "@/lib/analytics-geo";
import { upsertRecoveryLead } from "@/lib/recovery-agent/lead-tracker";
import { classifyAttribution } from "@/lib/analytics-attribution";
import {
  classifyBotFromUserAgent,
  classifyEngagementSuspicion,
} from "@/lib/analytics-bot";
import {
  ANALYTICS_DATA_VERSION,
  clientIpFromHeaders,
  hashIp,
} from "@/lib/analytics-v2";

const PATH_MAX = 512;
const SESSION_MAX = 128;
const EVENT_TYPE_MAX = 16;
const PAGE_LABEL_MAX = 256;
const LANG_MAX = 48;
const TZ_MAX = 80;
const DIM_MAX = 10000;
const TRAFFIC_STR_MAX = 256;
const GUIDE_INDEX_KEY = "__guides_index__";
const BLOG_INDEX_KEY = "__blog_index__";
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_IP = 40;

type TrackEventType = "view" | "leave" | "heartbeat" | "click" | "scroll";

function isTrackEventType(v: string): v is TrackEventType {
  return (
    v === "view" ||
    v === "leave" ||
    v === "heartbeat" ||
    v === "click" ||
    v === "scroll"
  );
}

function toFiniteNumber(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return raw;
}

function clampDim(raw: unknown): number | null {
  const n = toFiniteNumber(raw);
  if (n === null) return null;
  const r = Math.round(n);
  if (r < 0 || r > DIM_MAX) return null;
  return r;
}

function parseGuideTrafficKey(path: string): { key: string; slug: string; path: string } | null {
  if (path === "/guides") return { key: GUIDE_INDEX_KEY, slug: "", path };
  const m = /^\/guides\/([a-z0-9-]+)$/.exec(path);
  if (!m) return null;
  return { key: m[1], slug: m[1], path };
}

function normalizeTrackPath(pathRaw: string): string {
  let p = pathRaw.split("?")[0]?.split("#")[0] ?? pathRaw;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

function parseBlogTrafficKey(path: string): { key: string; slug: string; path: string } | null {
  if (path === "/blog") return { key: BLOG_INDEX_KEY, slug: "", path };
  const m = /^\/blog\/([a-z0-9-]+)$/.exec(path);
  if (!m) return null;
  return { key: m[1], slug: m[1], path };
}

async function incrementContentTraffic(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  keyInfo: { key: string; slug: string; path: string },
  collection: "analyticsGuideTraffic" | "analyticsBlogTraffic",
  visitorsCollection: "analyticsGuideTrafficVisitors" | "analyticsBlogTrafficVisitors",
  sessionId: string,
): Promise<void> {
  const trafficRef = db.collection(collection).doc(keyInfo.key);
  const visitorRef = db
    .collection(visitorsCollection)
    .doc(`${keyInfo.key}__${sessionId || "anon"}`);

  await db.runTransaction(async (tx) => {
    const visitorSnap = await tx.get(visitorRef);
    tx.set(
      trafficRef,
      {
        key: keyInfo.key,
        slug: keyInfo.slug,
        path: keyInfo.path,
        updatedAt: FieldValue.serverTimestamp(),
        views: FieldValue.increment(1),
      },
      { merge: true },
    );
    if (!visitorSnap.exists) {
      tx.set(visitorRef, {
        key: keyInfo.key,
        slug: keyInfo.slug,
        path: keyInfo.path,
        sessionId: sessionId || "anon",
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(trafficRef, { visitors: FieldValue.increment(1) }, { merge: true });
    }
  });
}

async function checkRateLimit(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  ipHash: string,
): Promise<boolean> {
  if (!ipHash) return true;
  const ref = db.collection("analyticsRateLimits").doc(ipHash);
  const now = Date.now();
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() as { windowStartMs?: number; count?: number } | undefined;
      const windowStart = data?.windowStartMs ?? now;
      const count = data?.count ?? 0;
      if (now - windowStart > RATE_WINDOW_MS) {
        tx.set(ref, { windowStartMs: now, count: 1, updatedAt: FieldValue.serverTimestamp() });
        return true;
      }
      if (count >= RATE_MAX_PER_IP) return false;
      tx.set(
        ref,
        { windowStartMs: windowStart, count: count + 1, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      return true;
    });
  } catch {
    return true;
  }
}

/**
 * Analytics ingest (v2). Always prefer 204 over 5xx for the browser.
 * Server re-classifies attribution — client trafficChannel is never trusted.
 */
export async function POST(req: Request) {
  const db = getAdminDb();
  if (!db) {
    return new NextResponse(null, { status: 204 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pathRaw = typeof body.path === "string" ? body.path : "";
  const sessionRaw =
    typeof body.sessionId === "string" ? body.sessionId : "anon";

  if (!pathRaw.startsWith("/") || pathRaw.length > PATH_MAX) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  if (pathRaw.startsWith("/admin") || pathRaw.startsWith("/api")) {
    return new NextResponse(null, { status: 204 });
  }

  const path = normalizeTrackPath(pathRaw.slice(0, PATH_MAX));
  const sessionId = sessionRaw.slice(0, SESSION_MAX);
  const visitorId =
    typeof body.visitorId === "string" ? body.visitorId.slice(0, SESSION_MAX) : "";
  const eventIdRaw =
    typeof body.eventId === "string" ? body.eventId.trim().slice(0, 80) : "";
  const eventTypeRaw =
    typeof body.eventType === "string" ? body.eventType : "view";
  const eventType = eventTypeRaw.slice(0, EVENT_TYPE_MAX);
  if (!isTrackEventType(eventType)) {
    return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
  }

  const ua = req.headers.get("user-agent") ?? "";
  const botUa = classifyBotFromUserAgent(ua);
  const { category, label, uaSnippet } = parseRequestDevice(req.headers);

  const purpose =
    req.headers.get("purpose")?.toLowerCase() ||
    req.headers.get("sec-purpose")?.toLowerCase() ||
    "";
  if (purpose.includes("prefetch") || purpose.includes("preview")) {
    return new NextResponse(null, { status: 204 });
  }

  const ipSecret = process.env.ANALYTICS_IP_HASH_SECRET?.trim() || "";
  const ip = clientIpFromHeaders(req.headers);
  const ipHash = ipSecret ? hashIp(ip, ipSecret) : hashIp(ip, "bsg-analytics-fallback");
  const allowed = await checkRateLimit(db, ipHash || sessionId);
  if (!allowed) {
    return new NextResponse(null, { status: 204 });
  }

  // Confirmed UA bots: store evidence but never inflate human/blog counters
  if (botUa.isBot) {
    try {
      const sessionRef = db.collection("analyticsSessions").doc(sessionId || "anon");
      await sessionRef.set(
        {
          sessionId: sessionId || "anon",
          lastPath: path,
          isActive: false,
          lastEventType: eventType,
          lastSeenAt: FieldValue.serverTimestamp(),
          firstSeenAt: FieldValue.serverTimestamp(),
          deviceCategory: category,
          deviceLabel: label,
          uaSnippet,
          isBot: true,
          visitorType: "bot",
          botName: botUa.botName,
          botCategory: botUa.botCategory,
          botReason: botUa.botReason,
          botConfidence: botUa.botConfidence,
          botSignals: botUa.botSignals,
          analyticsVersion: ANALYTICS_DATA_VERSION,
          trafficChannel: "other",
          trafficLabel: "Bot / crawler",
          source: "unknown",
          medium: "unknown",
          sourceConfidence: "unknown",
          attributionReason: "classified as bot from User-Agent",
        },
        { merge: true },
      );
      if (eventType === "view") {
        await db.collection("pageViews").add({
          path,
          sessionId,
          eventType: "view",
          isBot: true,
          visitorType: "bot",
          botName: botUa.botName,
          botCategory: botUa.botCategory,
          deviceCategory: category,
          deviceLabel: label,
          uaSnippet,
          analyticsVersion: ANALYTICS_DATA_VERSION,
          createdAt: FieldValue.serverTimestamp(),
          trafficChannel: "other",
          trafficLabel: "Bot / crawler",
        });
      }
    } catch (e) {
      console.error("bot analytics write failed", e);
    }
    return new NextResponse(null, { status: 204 });
  }

  // Idempotent event id
  if (eventIdRaw) {
    const eventRef = db.collection("analyticsEventIds").doc(eventIdRaw);
    try {
      const created = await db.runTransaction(async (tx) => {
        const snap = await tx.get(eventRef);
        if (snap.exists) return false;
        tx.set(eventRef, {
          createdAt: FieldValue.serverTimestamp(),
          sessionId,
          eventType,
          path,
        });
        return true;
      });
      if (!created) {
        return new NextResponse(null, { status: 204 });
      }
    } catch {
      /* continue without idempotency if txn fails */
    }
  }

  const sessionRef = db.collection("analyticsSessions").doc(sessionId || "anon");

  if (eventType === "heartbeat") {
    try {
      await sessionRef.set(
        {
          sessionId: sessionId || "anon",
          lastPath: path,
          isActive: true,
          lastEventType: "heartbeat",
          lastSeenAt: FieldValue.serverTimestamp(),
          analyticsVersion: ANALYTICS_DATA_VERSION,
        },
        { merge: true },
      );
    } catch (e) {
      console.error("heartbeat session update failed", e);
    }
    return new NextResponse(null, { status: 204 });
  }

  const sliceStr = (raw: unknown, max: number) =>
    typeof raw === "string" ? raw.trim().slice(0, max) || undefined : undefined;

  const pageLabel = sliceStr(body.pageLabel, PAGE_LABEL_MAX) ?? "";
  const clickLabel = sliceStr(body.clickLabel, 140) ?? "";
  const clickTarget = sliceStr(body.clickTarget, 32) ?? "";
  const clickHref = sliceStr(body.clickHref, 500) ?? "";
  const clickCategory = sliceStr(body.clickCategory, 24);
  const scrollDepthPct = toFiniteNumber(body.scrollDepthPct);
  const maxScrollDepthPct = toFiniteNumber(body.maxScrollDepthPct);
  const enteredAtMs = toFiniteNumber(body.enteredAtMs);
  const leftAtMs = toFiniteNumber(body.leftAtMs);
  const durationMsRaw = toFiniteNumber(body.durationMs);
  const durationMs =
    durationMsRaw === null
      ? null
      : Math.max(0, Math.min(Math.round(durationMsRaw), 1000 * 60 * 60 * 6));
  const interactionCount = toFiniteNumber(body.interactionCount);
  const webdriver = body.webdriver === true;
  const geo = geoFromRequestHeaders(req.headers);

  const screenWidth = clampDim(body.screenWidth);
  const screenHeight = clampDim(body.screenHeight);
  const viewportWidth = clampDim(body.viewportWidth);
  const viewportHeight = clampDim(body.viewportHeight);
  const language = sliceStr(body.language, LANG_MAX);
  const timeZone = sliceStr(body.timeZone, TZ_MAX);

  // Server-side attribution — ignore client trafficChannel
  const attribution = classifyAttribution({
    rawReferrer: sliceStr(body.rawReferrer, 500),
    utmSource: sliceStr(body.utmSource, TRAFFIC_STR_MAX),
    utmMedium: sliceStr(body.utmMedium, TRAFFIC_STR_MAX),
    utmCampaign: sliceStr(body.utmCampaign, TRAFFIC_STR_MAX),
    gclid: sliceStr(body.gclid, 128),
    fbclid: sliceStr(body.fbclid, 128),
    landingPath: sliceStr(body.landingPath, PATH_MAX) || path,
  });

  const suspicion = classifyEngagementSuspicion({
    durationMs: eventType === "leave" ? durationMs : null,
    maxScrollDepthPct,
    interactionCount,
    deviceLabel: label,
    claimedGoogleOrganic: attribution.channel === "google_organic",
    sourceConfidence: attribution.sourceConfidence,
    hasRawReferrer: Boolean(attribution.rawReferrer),
    secFetchDest: req.headers.get("sec-fetch-dest"),
    purposePrefetch: purpose.includes("prefetch"),
  });

  let visitorType: "human" | "suspected_bot" | "unknown" = "unknown";
  let botSignals = [...suspicion.signals];
  if (webdriver) {
    visitorType = "suspected_bot";
    botSignals.push("navigator_webdriver");
  } else if (eventType === "leave" && suspicion.suspected) {
    visitorType = "suspected_bot";
  } else if (
    eventType === "view" &&
    attribution.channel === "google_organic" &&
    attribution.sourceConfidence !== "high"
  ) {
    visitorType = "suspected_bot";
    botSignals.push("low_confidence_google");
  } else if (eventType === "click" || (maxScrollDepthPct != null && maxScrollDepthPct >= 10)) {
    visitorType = "human";
  } else if (eventType === "leave" && !suspicion.suspected && (durationMs ?? 0) >= 3000) {
    visitorType = "human";
  } else if (eventType === "view") {
    visitorType = "unknown"; // provisional until engagement
  }

  const sessionSnap = await sessionRef.get();
  const existing = sessionSnap.exists
    ? (sessionSnap.data() as Record<string, unknown>)
    : {};

  const sessionPayload: Record<string, unknown> = {
    sessionId: sessionId || "anon",
    lastPath: path,
    pageLabel,
    isActive: eventType !== "leave",
    lastEventType: eventType,
    lastSeenAt: FieldValue.serverTimestamp(),
    deviceCategory: category,
    deviceLabel: label,
    uaSnippet,
    analyticsVersion: ANALYTICS_DATA_VERSION,
    visitorType,
    source: attribution.source,
    medium: attribution.medium,
    sourceConfidence: attribution.sourceConfidence,
    attributionReason: attribution.attributionReason,
    rawReferrer: attribution.rawReferrer || undefined,
  };
  if (visitorId) sessionPayload.visitorId = visitorId;
  if (ipHash) sessionPayload.ipHash = ipHash;
  if (screenWidth != null) sessionPayload.screenWidth = screenWidth;
  if (screenHeight != null) sessionPayload.screenHeight = screenHeight;
  if (viewportWidth != null) sessionPayload.viewportWidth = viewportWidth;
  if (viewportHeight != null) sessionPayload.viewportHeight = viewportHeight;
  if (language) sessionPayload.language = language;
  if (timeZone) sessionPayload.timeZone = timeZone;
  if (interactionCount != null) sessionPayload.interactionCount = interactionCount;
  if (maxScrollDepthPct != null) {
    sessionPayload.maxScrollDepthPct = Math.min(100, Math.max(0, Math.round(maxScrollDepthPct)));
  }
  Object.assign(sessionPayload, geo);

  if (!sessionSnap.exists) {
    sessionPayload.firstSeenAt = FieldValue.serverTimestamp();
    sessionPayload.isBot = false;
    sessionPayload.botSignals = botSignals;
  } else {
    const prevType = String(existing.visitorType ?? "");
    // Escalate to suspected, or confirm human; never downgrade human → suspected on later heartbeat clicks
    if (visitorType === "human") {
      sessionPayload.visitorType = "human";
      sessionPayload.isEngagedSession = true;
    } else if (visitorType === "suspected_bot" && prevType !== "human") {
      sessionPayload.visitorType = "suspected_bot";
      sessionPayload.botReason = suspicion.reason || "Suspected automation";
      sessionPayload.botSignals = botSignals;
      sessionPayload.botConfidence = "medium";
    }
    if (typeof existing.isBot !== "boolean") {
      sessionPayload.isBot = false;
    }
  }

  const hasTraffic = Boolean(existing.trafficChannel || existing.source);
  if (!hasTraffic) {
    sessionPayload.trafficChannel = attribution.channel;
    sessionPayload.trafficLabel = attribution.label;
    sessionPayload.trafficDetail = attribution.detail;
    sessionPayload.referrerHost = attribution.referrerHost || undefined;
    sessionPayload.utmSource = attribution.utmSource || undefined;
    sessionPayload.utmMedium = attribution.utmMedium || undefined;
    sessionPayload.utmCampaign = attribution.utmCampaign || undefined;
    sessionPayload.landingPath = attribution.landingUrl || path;
  }

  const pageViewPayload: Record<string, unknown> = {
    path,
    sessionId,
    eventType,
    pageLabel,
    enteredAtMs,
    leftAtMs,
    durationMs,
    deviceCategory: category,
    deviceLabel: label,
    uaSnippet,
    isBot: false,
    visitorType,
    analyticsVersion: ANALYTICS_DATA_VERSION,
    createdAt: FieldValue.serverTimestamp(),
    source: attribution.source,
    medium: attribution.medium,
    sourceConfidence: attribution.sourceConfidence,
    attributionReason: attribution.attributionReason,
    ...geo,
  };
  if (visitorId) pageViewPayload.visitorId = visitorId;
  if (eventIdRaw) pageViewPayload.eventId = eventIdRaw;
  if (ipHash) pageViewPayload.ipHash = ipHash;
  if (screenWidth != null) pageViewPayload.screenWidth = screenWidth;
  if (screenHeight != null) pageViewPayload.screenHeight = screenHeight;
  if (viewportWidth != null) pageViewPayload.viewportWidth = viewportWidth;
  if (viewportHeight != null) pageViewPayload.viewportHeight = viewportHeight;
  if (language) pageViewPayload.language = language;
  if (timeZone) pageViewPayload.timeZone = timeZone;
  if (clickLabel) pageViewPayload.clickLabel = clickLabel;
  if (clickTarget) pageViewPayload.clickTarget = clickTarget;
  if (clickHref) pageViewPayload.clickHref = clickHref;
  if (clickCategory) pageViewPayload.clickCategory = clickCategory;
  if (scrollDepthPct != null) {
    pageViewPayload.scrollDepthPct = Math.min(100, Math.max(0, Math.round(scrollDepthPct)));
  }
  if (maxScrollDepthPct != null) {
    pageViewPayload.maxScrollDepthPct = Math.min(
      100,
      Math.max(0, Math.round(maxScrollDepthPct)),
    );
  }
  if (interactionCount != null) pageViewPayload.interactionCount = interactionCount;
  if (botSignals.length) pageViewPayload.botSignals = botSignals;

  if (eventType === "view" && !hasTraffic) {
    pageViewPayload.trafficChannel = attribution.channel;
    pageViewPayload.trafficLabel = attribution.label;
    pageViewPayload.trafficDetail = attribution.detail;
    pageViewPayload.referrerHost = attribution.referrerHost || undefined;
    pageViewPayload.utmSource = attribution.utmSource || undefined;
    pageViewPayload.utmMedium = attribution.utmMedium || undefined;
    pageViewPayload.utmCampaign = attribution.utmCampaign || undefined;
    pageViewPayload.landingPath = attribution.landingUrl || path;
    pageViewPayload.rawReferrer = attribution.rawReferrer || undefined;
  }

  try {
    const writes: Promise<unknown>[] = [sessionRef.set(sessionPayload, { merge: true })];
    if (eventIdRaw) {
      writes.push(
        db.collection("pageViews").doc(eventIdRaw).set(pageViewPayload, { merge: true }),
      );
    } else {
      writes.push(db.collection("pageViews").add(pageViewPayload));
    }
    await Promise.all(writes);
  } catch (e) {
    console.error("pageViews write failed", e);
    return new NextResponse(null, { status: 204 });
  }

  // Only count blog/guide uniqueness for non-suspected traffic
  if (eventType === "view" && visitorType !== "suspected_bot") {
    const guideKey = parseGuideTrafficKey(path);
    if (guideKey) {
      try {
        await incrementContentTraffic(
          db,
          guideKey,
          "analyticsGuideTraffic",
          "analyticsGuideTrafficVisitors",
          sessionId,
        );
      } catch (e) {
        console.error("analyticsGuideTraffic txn failed", e);
      }
    }
    const blogKey = parseBlogTrafficKey(path);
    if (blogKey) {
      try {
        await incrementContentTraffic(
          db,
          blogKey,
          "analyticsBlogTraffic",
          "analyticsBlogTrafficVisitors",
          sessionId,
        );
      } catch (e) {
        console.error("analyticsBlogTraffic txn failed", e);
      }
    }

    if (visitorType === "human" || visitorType === "unknown") {
      void trackRecoveryFromPageView({
        path,
        sessionId,
        landingPath: attribution.landingUrl,
        clickCategory,
        eventType,
        durationMs: durationMs ?? undefined,
      }).catch((e) => console.error("[recovery-agent] track view failed", e));
    }
  }

  if (eventType === "click" && clickCategory === "whatsapp") {
    void upsertRecoveryLead({
      sessionId,
      path,
      landingPath: attribution.landingUrl,
      event: "whatsapp_click",
    }).catch(() => {});
  }

  if (
    eventType === "leave" &&
    (path === "/booking" || path.startsWith("/booking")) &&
    durationMs != null &&
    durationMs >= 5000
  ) {
    void upsertRecoveryLead({
      sessionId,
      path,
      landingPath: attribution.landingUrl,
      event: "booking_page_view",
      dwellSec: Math.round(durationMs / 1000),
    }).catch(() => {});
  }

  return new NextResponse(null, { status: 204 });
}

async function trackRecoveryFromPageView(opts: {
  path: string;
  sessionId: string;
  landingPath?: string;
  clickCategory?: string;
  eventType: string;
  durationMs?: number;
}) {
  if (opts.eventType !== "view" && opts.eventType !== "leave") return;

  let event: Parameters<typeof upsertRecoveryLead>[0]["event"] | null = null;
  if (opts.path === "/booking" || opts.path.startsWith("/booking")) {
    event = "booking_page_view";
  } else if (
    opts.path.startsWith("/services/") ||
    opts.path === "/services" ||
    opts.path.includes("price")
  ) {
    event = "pricing_page_view";
  } else if (opts.eventType === "view") {
    event = "session_visit";
  }

  if (!event) return;

  await upsertRecoveryLead({
    sessionId: opts.sessionId,
    path: opts.path,
    landingPath: opts.landingPath,
    event,
    dwellSec:
      opts.eventType === "leave" && opts.durationMs
        ? Math.round(opts.durationMs / 1000)
        : undefined,
  });
}
