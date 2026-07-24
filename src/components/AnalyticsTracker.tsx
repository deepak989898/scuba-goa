"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { classifyTrafficSource } from "@/lib/analytics-traffic";
import { classifyClick } from "@/lib/conversion-opt/click-category";
import {
  getOrCreateAnalyticsSessionId,
  getOrCreateAnalyticsVisitorId,
} from "@/lib/analytics-client-ids";

const TRAFFIC_KEY = "bsg_analytics_traffic";
/** Prefer short path — `/api/analytics/track` is commonly blocked by ad blockers. */
const TRACK_URL = "/api/t";
/** Dedupe React Strict Mode double-invoke (same path within a few seconds). */
const lastTrackAt = new Map<string, number>();
const HEARTBEAT_MS = 180_000;
const TRACK_TIMEOUT_MS = 12_000;
const CLICK_THROTTLE_MS = 1_500;

type EventType = "view" | "leave" | "heartbeat" | "click" | "scroll";

type VisitState = { path: string; enteredAtMs: number; pageLabel: string };

type TrafficPayload = {
  trafficChannel: string;
  trafficLabel: string;
  trafficDetail: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  landingPath: string;
  rawReferrer: string;
  gclid: string;
  fbclid: string;
};

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getVisitorId(): string {
  return getOrCreateAnalyticsVisitorId();
}

function getTrafficPayload(landingPath: string): TrafficPayload {
  if (typeof window === "undefined") {
    return {
      trafficChannel: "",
      trafficLabel: "",
      trafficDetail: "",
      referrerHost: "",
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      landingPath,
      rawReferrer: "",
      gclid: "",
      fbclid: "",
    };
  }
  try {
    const cached = sessionStorage.getItem(TRAFFIC_KEY);
    if (cached) return JSON.parse(cached) as TrafficPayload;
  } catch {
    /* ignore */
  }

  const params = new URLSearchParams(window.location.search);
  const rawReferrer = typeof document !== "undefined" ? document.referrer : "";
  const info = classifyTrafficSource({
    referrer: rawReferrer,
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    gclid: params.get("gclid") ?? undefined,
    fbclid: params.get("fbclid") ?? undefined,
    landingPath,
  });

  const payload: TrafficPayload = {
    trafficChannel: info.channel,
    trafficLabel: info.label,
    trafficDetail: info.detail,
    referrerHost: info.referrerHost,
    utmSource: info.utmSource,
    utmMedium: info.utmMedium,
    utmCampaign: info.utmCampaign,
    landingPath: info.landingPath,
    rawReferrer: rawReferrer.slice(0, 500),
    gclid: (params.get("gclid") ?? "").slice(0, 128),
    fbclid: (params.get("fbclid") ?? "").slice(0, 128),
  };

  try {
    sessionStorage.setItem(TRAFFIC_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  return payload;
}

function clientContextPayload() {
  if (typeof window === "undefined") return {};
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      screenWidth: window.screen?.width,
      screenHeight: window.screen?.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      language: navigator.language?.slice(0, 48),
      timeZone: timeZone?.slice(0, 80),
      webdriver: Boolean((navigator as Navigator & { webdriver?: boolean }).webdriver),
    };
  } catch {
    return {};
  }
}

function isAnalyticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
    return false;
  }
  return true;
}

function track(
  payload: {
    path: string;
    sessionId: string;
    visitorId?: string;
    eventId?: string;
    eventType: EventType;
    pageLabel?: string;
    clickLabel?: string;
    clickTarget?: string;
    clickHref?: string;
    clickCategory?: string;
    scrollDepthPct?: number;
    maxScrollDepthPct?: number;
    enteredAtMs?: number;
    leftAtMs?: number;
    durationMs?: number;
    interactionCount?: number;
  } & ReturnType<typeof clientContextPayload> &
    Partial<TrafficPayload>
) {
  if (!isAnalyticsEnabled()) return;

  const eventId = payload.eventId || newId("e");
  const visitorId = payload.visitorId || getVisitorId();
  const body = JSON.stringify({
    ...clientContextPayload(),
    ...payload,
    eventId,
    visitorId,
    analyticsVersion: 2,
  });
  if (
    payload.eventType === "leave" &&
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function"
  ) {
    const blob = new Blob([body], { type: "application/json" });
    try {
      navigator.sendBeacon(TRACK_URL, blob);
    } catch {
      /* ignore */
    }
    return;
  }

  let signal: AbortSignal | undefined;
  if (typeof AbortController !== "undefined") {
    const controller = new AbortController();
    signal = controller.signal;
    window.setTimeout(() => controller.abort(), TRACK_TIMEOUT_MS);
  }

  void fetch(TRACK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: payload.eventType === "leave",
    signal,
  }).catch(() => {});
}

function getSessionId(): string {
  return getOrCreateAnalyticsSessionId();
}

export function AnalyticsTracker() {
  const pathname = usePathname() ?? "/";
  const visitRef = useRef<VisitState | null>(null);
  const maxScrollRef = useRef(0);
  const interactionCountRef = useRef(0);

  useEffect(() => {
    if (!pathname.startsWith("/") || pathname.startsWith("/admin")) return;

    const key = pathname || "/";
    const now = Date.now();
    const prevDedupe = lastTrackAt.get(key) ?? 0;
    if (now - prevDedupe < 2500) return;
    lastTrackAt.set(key, now);

    const sessionId = getSessionId();
    const visitorId = getVisitorId();
    const pageLabel =
      typeof document !== "undefined" ? document.title.trim() : "";

    maxScrollRef.current = 0;

    const prevVisit = visitRef.current;
    if (prevVisit && prevVisit.path !== key) {
      const durationMs = Math.max(0, now - prevVisit.enteredAtMs);
      track({
        path: prevVisit.path,
        sessionId,
        visitorId,
        eventType: "leave",
        pageLabel: prevVisit.pageLabel,
        enteredAtMs: prevVisit.enteredAtMs,
        leftAtMs: now,
        durationMs,
        maxScrollDepthPct: maxScrollRef.current,
        interactionCount: interactionCountRef.current,
      });
    }

    visitRef.current = { path: key, enteredAtMs: now, pageLabel };
    const traffic = getTrafficPayload(key);
    track({
      path: key,
      sessionId,
      visitorId,
      eventType: "view",
      pageLabel,
      ...traffic,
    });

    const hb = window.setInterval(() => {
      const v = visitRef.current;
      if (!v || v.path !== key) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      track({
        path: v.path,
        sessionId,
        visitorId,
        eventType: "heartbeat",
        pageLabel: v.pageLabel,
        interactionCount: interactionCountRef.current,
        maxScrollDepthPct: maxScrollRef.current,
      });
    }, HEARTBEAT_MS);

    const onHidden = () => {
      if (!visitRef.current) return;
      if (document.visibilityState !== "hidden") return;
      const leftNow = Date.now();
      const current = visitRef.current;
      track({
        path: current.path,
        sessionId,
        visitorId,
        eventType: "leave",
        pageLabel: current.pageLabel,
        enteredAtMs: current.enteredAtMs,
        leftAtMs: leftNow,
        durationMs: Math.max(0, leftNow - current.enteredAtMs),
        maxScrollDepthPct: maxScrollRef.current,
        interactionCount: interactionCountRef.current,
      });
    };

    document.addEventListener("visibilitychange", onHidden);

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const height = Math.max(doc.scrollHeight - window.innerHeight, 1);
      const pct = Math.min(100, Math.round((scrollTop / height) * 100));
      if (pct > maxScrollRef.current) {
        maxScrollRef.current = pct;
        if (pct >= 10) interactionCountRef.current += 1;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const lastClickAt = new Map<string, number>();
    const onDocumentClick = (ev: MouseEvent) => {
      const target = ev.target;
      if (!(target instanceof Element)) return;
      const clickable = target.closest(
        "a,button,[role='button'],[data-analytics-click]",
      );
      if (!(clickable instanceof Element)) return;

      interactionCountRef.current += 1;

      const rawText =
        clickable instanceof HTMLAnchorElement ||
        clickable instanceof HTMLButtonElement
          ? clickable.innerText || clickable.textContent || ""
          : clickable.textContent || "";
      const clickLabel = rawText.replace(/\s+/g, " ").trim().slice(0, 140);
      const clickTarget = clickable.tagName.toLowerCase();
      const clickHref =
        clickable instanceof HTMLAnchorElement
          ? (clickable.getAttribute("href") || "").slice(0, 500)
          : "";

      const dedupeKey = `${clickTarget}:${clickHref}:${clickLabel.slice(0, 32)}`;
      const lastAt = lastClickAt.get(dedupeKey) ?? 0;
      const nowMs = Date.now();
      if (nowMs - lastAt < CLICK_THROTTLE_MS) return;
      lastClickAt.set(dedupeKey, nowMs);

      const current = visitRef.current;
      track({
        path: current?.path || key,
        sessionId,
        visitorId,
        eventType: "click",
        pageLabel: current?.pageLabel || pageLabel,
        clickLabel,
        clickTarget,
        clickHref,
        clickCategory: classifyClick(clickHref, clickLabel, clickable),
        interactionCount: interactionCountRef.current,
      });
    };

    document.addEventListener("click", onDocumentClick, { passive: true });

    return () => {
      window.clearInterval(hb);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHidden);
      document.removeEventListener("click", onDocumentClick);
    };
  }, [pathname]);

  useEffect(() => {
    return () => {
      const current = visitRef.current;
      if (!current) return;
      const sessionId = getSessionId();
      const visitorId = getVisitorId();
      const now = Date.now();
      track({
        path: current.path,
        sessionId,
        visitorId,
        eventType: "leave",
        pageLabel: current.pageLabel,
        enteredAtMs: current.enteredAtMs,
        leftAtMs: now,
        durationMs: Math.max(0, now - current.enteredAtMs),
        maxScrollDepthPct: maxScrollRef.current,
        interactionCount: interactionCountRef.current,
      });
    };
  }, []);

  return null;
}
