"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const SESSION_KEY = "bsg_analytics_sid";
/** Dedupe React Strict Mode double-invoke (same path within a few seconds). */
const lastTrackAt = new Map<string, number>();
/**
 * Lower-frequency heartbeat. We pause heartbeats while the tab is hidden, so
 * 60s strikes a good balance between session liveliness and Firestore writes.
 */
const HEARTBEAT_MS = 60_000;
/**
 * Hard cap on each `/api/analytics/track` request. Without this an unhealthy
 * serverless cold start could leave the browser stuck on the request and
 * eventually fail with `net::ERR_TIMED_OUT`, which then surfaces in DevTools.
 */
const TRACK_TIMEOUT_MS = 5_000;
/** Per-element click dedupe window — collapses bursts of taps. */
const CLICK_THROTTLE_MS = 1_500;

type EventType = "view" | "leave" | "heartbeat" | "click";

type VisitState = { path: string; enteredAtMs: number; pageLabel: string };

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
    };
  } catch {
    return {};
  }
}

function isAnalyticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (!host) return false;
  // Skip in local dev so the dev console stays clean of expected network noise.
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
    return false;
  }
  return true;
}

function track(
  payload: {
    path: string;
    sessionId: string;
    eventType: EventType;
    pageLabel?: string;
    clickLabel?: string;
    clickTarget?: string;
    clickHref?: string;
    enteredAtMs?: number;
    leftAtMs?: number;
    durationMs?: number;
  } & ReturnType<typeof clientContextPayload>
) {
  if (!isAnalyticsEnabled()) return;

  const body = JSON.stringify({ ...clientContextPayload(), ...payload });
  if (
    payload.eventType === "leave" &&
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function"
  ) {
    const blob = new Blob([body], { type: "application/json" });
    try {
      navigator.sendBeacon("/api/analytics/track", blob);
    } catch {
      /* sendBeacon can throw under strict permissions — swallow silently */
    }
    return;
  }

  /**
   * Abort the request after `TRACK_TIMEOUT_MS` so a slow / cold serverless
   * function can never block the page or surface `ERR_TIMED_OUT` to users.
   */
  let signal: AbortSignal | undefined;
  if (typeof AbortController !== "undefined") {
    const controller = new AbortController();
    signal = controller.signal;
    window.setTimeout(() => controller.abort(), TRACK_TIMEOUT_MS);
  }

  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: payload.eventType === "leave",
    signal,
  }).catch(() => {});
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s_${Date.now()}`;
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname() ?? "/";
  const visitRef = useRef<VisitState | null>(null);

  useEffect(() => {
    if (!pathname.startsWith("/") || pathname.startsWith("/admin")) return;

    const key = pathname || "/";
    const now = Date.now();
    const prevDedupe = lastTrackAt.get(key) ?? 0;
    if (now - prevDedupe < 2500) return;
    lastTrackAt.set(key, now);

    const sessionId = getSessionId();
    const pageLabel =
      typeof document !== "undefined" ? document.title.trim() : "";

    const prevVisit = visitRef.current;
    if (prevVisit && prevVisit.path !== key) {
      const durationMs = Math.max(0, now - prevVisit.enteredAtMs);
      track({
        path: prevVisit.path,
        sessionId,
        eventType: "leave",
        pageLabel: prevVisit.pageLabel,
        enteredAtMs: prevVisit.enteredAtMs,
        leftAtMs: now,
        durationMs,
      });
    }

    visitRef.current = { path: key, enteredAtMs: now, pageLabel };
    track({ path: key, sessionId, eventType: "view", pageLabel });

    /**
     * Heartbeat fires on a fixed interval but skips ticks while the tab is
     * hidden — we already emit a "leave" on visibility change, so there is no
     * reason to keep pinging Firestore for background tabs.
     */
    const hb = window.setInterval(() => {
      const v = visitRef.current;
      if (!v || v.path !== key) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      track({
        path: v.path,
        sessionId,
        eventType: "heartbeat",
        pageLabel: v.pageLabel,
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
        eventType: "leave",
        pageLabel: current.pageLabel,
        enteredAtMs: current.enteredAtMs,
        leftAtMs: leftNow,
        durationMs: Math.max(0, leftNow - current.enteredAtMs),
      });
    };

    document.addEventListener("visibilitychange", onHidden);

    /**
     * Per-element throttle. Without this, rapid taps (mobile double-tap, slow
     * cards, ripple buttons) generated 3–5 click events for one user intent,
     * which both spammed Firestore and inflated the click counters.
     */
    const lastClickAt = new Map<string, number>();
    const onDocumentClick = (ev: MouseEvent) => {
      const target = ev.target;
      if (!(target instanceof Element)) return;
      const clickable = target.closest("a,button,[role='button'],[data-analytics-click]");
      if (!(clickable instanceof Element)) return;

      const rawText =
        clickable instanceof HTMLAnchorElement || clickable instanceof HTMLButtonElement
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
        eventType: "click",
        pageLabel: current?.pageLabel || pageLabel,
        clickLabel,
        clickTarget,
        clickHref,
      });
    };

    document.addEventListener("click", onDocumentClick, { passive: true });

    return () => {
      window.clearInterval(hb);
      document.removeEventListener("visibilitychange", onHidden);
      document.removeEventListener("click", onDocumentClick);
    };
  }, [pathname]);

  useEffect(() => {
    return () => {
      const current = visitRef.current;
      if (!current) return;
      const sessionId = getSessionId();
      const now = Date.now();
      track({
        path: current.path,
        sessionId,
        eventType: "leave",
        pageLabel: current.pageLabel,
        enteredAtMs: current.enteredAtMs,
        leftAtMs: now,
        durationMs: Math.max(0, now - current.enteredAtMs),
      });
    };
  }, []);

  return null;
}
