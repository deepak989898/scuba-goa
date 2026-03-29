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

type TrackEventType = "view" | "leave" | "heartbeat";

function isTrackEventType(v: string): v is TrackEventType {
  return v === "view" || v === "leave" || v === "heartbeat";
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
    screenWidth?: number;
    screenHeight?: number;
    viewportWidth?: number;
    viewportHeight?: number;
    language?: string;
    timeZone?: string;
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

  const path = pathRaw.slice(0, PATH_MAX);
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
  const enteredAtMs = toFiniteNumber(body.enteredAtMs);
  const leftAtMs = toFiniteNumber(body.leftAtMs);
  const durationMsRaw = toFiniteNumber(body.durationMs);
  const durationMs =
    durationMsRaw === null
      ? null
      : Math.max(0, Math.min(Math.round(durationMsRaw), 1000 * 60 * 60 * 6));
  const { category, label, uaSnippet } = parseRequestDevice(req.headers);
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

  const sessionRef = db.collection("analyticsSessions").doc(sessionId || "anon");
  const sessionSnap = await sessionRef.get();
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
    createdAt: FieldValue.serverTimestamp(),
    ...geo,
  };
  if (screenWidth != null) pageViewPayload.screenWidth = screenWidth;
  if (screenHeight != null) pageViewPayload.screenHeight = screenHeight;
  if (viewportWidth != null) pageViewPayload.viewportWidth = viewportWidth;
  if (viewportHeight != null) pageViewPayload.viewportHeight = viewportHeight;
  if (language) pageViewPayload.language = language;
  if (timeZone) pageViewPayload.timeZone = timeZone;

  try {
    await db.collection("pageViews").add(pageViewPayload);

    await sessionRef.set(sessionPayload, { merge: true });
  } catch (e) {
    console.error("pageViews write failed", e);
    return NextResponse.json({ error: "Track failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
