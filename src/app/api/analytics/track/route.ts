import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { parseRequestDevice } from "@/lib/clientDevice";
import { geoFromRequestHeaders } from "@/lib/analytics-geo";

const PATH_MAX = 512;
const SESSION_MAX = 128;
const EVENT_TYPE_MAX = 16;
const PAGE_LABEL_MAX = 256;
const LANG_MAX = 48;
const TZ_MAX = 80;
const DIM_MAX = 10000;
const TRAFFIC_STR_MAX = 256;
const TRAFFIC_CHANNEL_MAX = 32;
const GUIDE_INDEX_KEY = "__guides_index__";
const BLOG_INDEX_KEY = "__blog_index__";

type TrackEventType = "view" | "leave" | "heartbeat" | "click";

function isTrackEventType(v: string): v is TrackEventType {
  return v === "view" || v === "leave" || v === "heartbeat" || v === "click";
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
  if (path === "/guides") {
    return { key: GUIDE_INDEX_KEY, slug: "", path };
  }
  const m = /^\/guides\/([a-z0-9-]+)$/.exec(path);
  if (!m) return null;
  const slug = m[1];
  return { key: slug, slug, path };
}

function normalizeTrackPath(pathRaw: string): string {
  let p = pathRaw.split("?")[0]?.split("#")[0] ?? pathRaw;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

function parseBlogTrafficKey(path: string): { key: string; slug: string; path: string } | null {
  if (path === "/blog") {
    return { key: BLOG_INDEX_KEY, slug: "", path };
  }
  const m = /^\/blog\/([a-z0-9-]+)$/.exec(path);
  if (!m) return null;
  const slug = m[1];
  return { key: slug, slug, path };
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

  // Firestore requires all reads before any writes in a transaction.
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

/**
 * Best-effort analytics ingest.
 *
 * This endpoint is called from every public page (view + leave + heartbeat +
 * click). It must NEVER return a 5xx to the browser, otherwise:
 *
 * - DevTools spams the console with `POST /api/analytics/track 500`.
 * - Web Vitals look worse than they are.
 * - End users sometimes see the "request failed" badge in our error overlay.
 *
 * Strategy: do the writes inside a try/catch and always reply with 204. If the
 * Admin SDK is unavailable (env not set, project disabled, quota exceeded) we
 * silently no-op. Diagnostics still land in Vercel logs via console.error.
 */
export async function POST(req: Request) {
  const db = getAdminDb();
  if (!db) {
    return new NextResponse(null, { status: 204 });
  }

  let body: {
    path?: string;
    sessionId?: string;
    eventType?: string;
    pageLabel?: string;
    enteredAtMs?: number;
    leftAtMs?: number;
    durationMs?: number;
    clickLabel?: string;
    clickTarget?: string;
    clickHref?: string;
    screenWidth?: number;
    screenHeight?: number;
    viewportWidth?: number;
    viewportHeight?: number;
    language?: string;
    timeZone?: string;
    trafficChannel?: string;
    trafficLabel?: string;
    trafficDetail?: string;
    referrerHost?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    landingPath?: string;
  };
  try {
    body = await req.json();
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
  const eventTypeRaw =
    typeof body.eventType === "string" ? body.eventType : "view";
  const eventType = eventTypeRaw.slice(0, EVENT_TYPE_MAX);
  if (!isTrackEventType(eventType)) {
    return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
  }

  const pageLabel =
    typeof body.pageLabel === "string"
      ? body.pageLabel.slice(0, PAGE_LABEL_MAX)
      : "";
  const clickLabel =
    typeof body.clickLabel === "string" ? body.clickLabel.slice(0, 140) : "";
  const clickTarget =
    typeof body.clickTarget === "string" ? body.clickTarget.slice(0, 32) : "";
  const clickHref =
    typeof body.clickHref === "string" ? body.clickHref.slice(0, 500) : "";
  const enteredAtMs = toFiniteNumber(body.enteredAtMs);
  const leftAtMs = toFiniteNumber(body.leftAtMs);
  const durationMsRaw = toFiniteNumber(body.durationMs);
  const durationMs =
    durationMsRaw === null
      ? null
      : Math.max(0, Math.min(Math.round(durationMsRaw), 1000 * 60 * 60 * 6));
  const { category, label, uaSnippet, isBot } = parseRequestDevice(req.headers);
  const geo = geoFromRequestHeaders(req.headers);

  const screenWidth = clampDim(body.screenWidth);
  const screenHeight = clampDim(body.screenHeight);
  const viewportWidth = clampDim(body.viewportWidth);
  const viewportHeight = clampDim(body.viewportHeight);
  const language =
    typeof body.language === "string"
      ? body.language.trim().slice(0, LANG_MAX) || undefined
      : undefined;
  const timeZone =
    typeof body.timeZone === "string"
      ? body.timeZone.trim().slice(0, TZ_MAX) || undefined
      : undefined;

  const sliceStr = (raw: unknown, max: number) =>
    typeof raw === "string" ? raw.trim().slice(0, max) || undefined : undefined;

  const trafficChannel = sliceStr(body.trafficChannel, TRAFFIC_CHANNEL_MAX);
  const trafficLabel = sliceStr(body.trafficLabel, TRAFFIC_STR_MAX);
  const trafficDetail = sliceStr(body.trafficDetail, TRAFFIC_STR_MAX);
  const referrerHost = sliceStr(body.referrerHost, TRAFFIC_STR_MAX);
  const utmSource = sliceStr(body.utmSource, TRAFFIC_STR_MAX);
  const utmMedium = sliceStr(body.utmMedium, TRAFFIC_STR_MAX);
  const utmCampaign = sliceStr(body.utmCampaign, TRAFFIC_STR_MAX);
  const landingPath = sliceStr(body.landingPath, PATH_MAX);

  const sessionRef = db.collection("analyticsSessions").doc(sessionId || "anon");
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
    ...geo,
  };
  if (screenWidth != null) sessionPayload.screenWidth = screenWidth;
  if (screenHeight != null) sessionPayload.screenHeight = screenHeight;
  if (viewportWidth != null) sessionPayload.viewportWidth = viewportWidth;
  if (viewportHeight != null) sessionPayload.viewportHeight = viewportHeight;
  if (language) sessionPayload.language = language;
  if (timeZone) sessionPayload.timeZone = timeZone;
  if (!sessionSnap.exists) {
    sessionPayload.firstSeenAt = FieldValue.serverTimestamp();
    sessionPayload.isBot = isBot;
  } else if (typeof existing.isBot !== "boolean") {
    sessionPayload.isBot = isBot;
  }
  const hasTraffic = Boolean(existing.trafficChannel);
  if (!hasTraffic && trafficChannel) {
    sessionPayload.trafficChannel = trafficChannel;
    if (trafficLabel) sessionPayload.trafficLabel = trafficLabel;
    if (trafficDetail) sessionPayload.trafficDetail = trafficDetail;
    if (referrerHost) sessionPayload.referrerHost = referrerHost;
    if (utmSource) sessionPayload.utmSource = utmSource;
    if (utmMedium) sessionPayload.utmMedium = utmMedium;
    if (utmCampaign) sessionPayload.utmCampaign = utmCampaign;
    if (landingPath) sessionPayload.landingPath = landingPath;
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
    isBot,
    createdAt: FieldValue.serverTimestamp(),
    ...geo,
  };
  if (screenWidth != null) pageViewPayload.screenWidth = screenWidth;
  if (screenHeight != null) pageViewPayload.screenHeight = screenHeight;
  if (viewportWidth != null) pageViewPayload.viewportWidth = viewportWidth;
  if (viewportHeight != null) pageViewPayload.viewportHeight = viewportHeight;
  if (language) pageViewPayload.language = language;
  if (timeZone) pageViewPayload.timeZone = timeZone;
  if (clickLabel) pageViewPayload.clickLabel = clickLabel;
  if (clickTarget) pageViewPayload.clickTarget = clickTarget;
  if (clickHref) pageViewPayload.clickHref = clickHref;
  if (eventType === "view" && trafficChannel && !hasTraffic) {
    pageViewPayload.trafficChannel = trafficChannel;
    if (trafficLabel) pageViewPayload.trafficLabel = trafficLabel;
    if (trafficDetail) pageViewPayload.trafficDetail = trafficDetail;
    if (referrerHost) pageViewPayload.referrerHost = referrerHost;
    if (utmSource) pageViewPayload.utmSource = utmSource;
    if (utmMedium) pageViewPayload.utmMedium = utmMedium;
    if (utmCampaign) pageViewPayload.utmCampaign = utmCampaign;
    if (landingPath) pageViewPayload.landingPath = landingPath;
  }

  /**
   * Primary write (pageView + session). Wrap in try/catch and swallow — never
   * surface a 5xx to the client.
   */
  try {
    await Promise.all([
      db.collection("pageViews").add(pageViewPayload),
      sessionRef.set(sessionPayload, { merge: true }),
    ]);
  } catch (e) {
    console.error("pageViews write failed", e);
    return new NextResponse(null, { status: 204 });
  }

  /**
   * Guide-traffic aggregation runs in the background. Awaiting the transaction
   * inline added ~150–400 ms to every "view" event and any failure (contention,
   * cold start) would surface as a 500 in the browser. Fire-and-forget keeps
   * the response snappy and the console clean.
   */
  if (eventType === "view") {
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
  }

  return new NextResponse(null, { status: 204 });
}
