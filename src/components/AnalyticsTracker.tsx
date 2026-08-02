"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { classifyClick } from "@/lib/conversion-opt/click-category";
import {
  getOrCreateAnalyticsSessionId,
  getOrCreateAnalyticsVisitorId,
} from "@/lib/analytics-client-ids";
import {
  getOrCaptureAnalyticsTraffic,
  type AnalyticsTrafficPayload,
} from "@/lib/analytics-first-touch";

/** Prefer short path — `/api/analytics/track` is commonly blocked by ad blockers. */
const TRACK_URL = "/api/t";
/** Only collapse identical path views from React Strict Mode double-mount. */
const VIEW_DEDUPE_MS = 400;
/**
 * Heartbeat for admin "Online". Keep sparse — each ping costs Firestore
 * rate-limit + session writes. 25s was burning ~100k+ reads/day with few tabs.
 */
const HEARTBEAT_MS = 180_000;
const TRACK_TIMEOUT_MS = 12_000;
const CLICK_THROTTLE_MS = 600;

type EventType = "view" | "leave" | "heartbeat" | "click" | "scroll";

type VisitState = {
  path: string;
  enteredAtMs: number;
  pageLabel: string;
  /** Active time only (pauses while tab is hidden). */
  activeAccumMs: number;
  activeSegmentStartedAt: number | null;
};

type TrafficPayload = AnalyticsTrafficPayload;

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
  return getOrCaptureAnalyticsTraffic(landingPath);
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
      webdriver: Boolean(
        (navigator as Navigator & { webdriver?: boolean }).webdriver,
      ),
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
    keepAliveSession?: boolean;
  } & ReturnType<typeof clientContextPayload> &
    Partial<TrafficPayload>,
) {
  if (!isAnalyticsEnabled()) return;

  // Heartbeats are merge-only session pings — skip eventId to avoid a Firestore txn read each time.
  const eventId =
    payload.eventType === "heartbeat"
      ? undefined
      : payload.eventId || newId("e");
  const visitorId = payload.visitorId || getVisitorId();
  const body = JSON.stringify({
    ...clientContextPayload(),
    ...payload,
    ...(eventId ? { eventId } : {}),
    visitorId,
    analyticsVersion: 2,
  });

  const preferBeacon =
    (payload.eventType === "leave" || payload.eventType === "click") &&
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function";

  if (preferBeacon) {
    try {
      if (
        navigator.sendBeacon(
          TRACK_URL,
          new Blob([body], { type: "application/json" }),
        )
      ) {
        return;
      }
    } catch {
      /* fall through */
    }
  }

  let signal: AbortSignal | undefined;
  if (
    typeof AbortController !== "undefined" &&
    payload.eventType !== "click" &&
    payload.eventType !== "leave"
  ) {
    const controller = new AbortController();
    signal = controller.signal;
    window.setTimeout(() => controller.abort(), TRACK_TIMEOUT_MS);
  }

  void fetch(TRACK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive:
      payload.eventType === "leave" ||
      payload.eventType === "view" ||
      payload.eventType === "heartbeat" ||
      payload.eventType === "click",
    signal,
  }).catch(() => {
    if (
      typeof navigator === "undefined" ||
      typeof navigator.sendBeacon !== "function"
    ) {
      return;
    }
    try {
      navigator.sendBeacon(
        TRACK_URL,
        new Blob([body], { type: "application/json" }),
      );
    } catch {
      /* ignore */
    }
  });
}

function getSessionId(): string {
  return getOrCreateAnalyticsSessionId();
}

function pauseActiveTime(visit: VisitState, now: number): void {
  if (visit.activeSegmentStartedAt == null) return;
  visit.activeAccumMs += Math.max(0, now - visit.activeSegmentStartedAt);
  visit.activeSegmentStartedAt = null;
}

function resumeActiveTime(visit: VisitState, now: number): void {
  if (visit.activeSegmentStartedAt != null) return;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return;
  }
  visit.activeSegmentStartedAt = now;
}

function activeDurationMs(visit: VisitState, now: number): number {
  let ms = visit.activeAccumMs;
  if (visit.activeSegmentStartedAt != null) {
    ms += Math.max(0, now - visit.activeSegmentStartedAt);
  }
  return ms;
}

/** Module-level so Strict Mode remounts still dedupe the same path view. */
const lastViewAt = new Map<string, number>();

export function AnalyticsTracker() {
  const pathname = usePathname() ?? "/";
  const visitRef = useRef<VisitState | null>(null);
  const maxScrollRef = useRef(0);
  const interactionCountRef = useRef(0);
  const leftPathsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!pathname.startsWith("/")) return;

    const key = pathname || "/";
    const now = Date.now();
    const sessionId = getSessionId();
    const visitorId = getVisitorId();

    const traffic = getTrafficPayload(key);

    const sendLeave = (visit: VisitState) => {
      const leaveKey = `${visit.path}:${visit.enteredAtMs}`;
      if (leftPathsRef.current.has(leaveKey)) return;
      leftPathsRef.current.add(leaveKey);
      pauseActiveTime(visit, Date.now());
      const leftNow = Date.now();
      track({
        path: visit.path,
        sessionId,
        visitorId,
        eventType: "leave",
        pageLabel: visit.pageLabel,
        enteredAtMs: visit.enteredAtMs,
        leftAtMs: leftNow,
        durationMs: Math.max(0, activeDurationMs(visit, leftNow)),
        maxScrollDepthPct: maxScrollRef.current,
        interactionCount: interactionCountRef.current,
        keepAliveSession: false,
        ...traffic,
      });
    };

    // Close previous public page with real active time (before scroll reset).
    const prevVisit = visitRef.current;
    if (prevVisit && prevVisit.path !== key) {
      sendLeave(prevVisit);
      visitRef.current = null;
    }

    if (pathname.startsWith("/admin")) {
      maxScrollRef.current = 0;
      return;
    }

    const pageLabel =
      typeof document !== "undefined" ? document.title.trim() : "";

    // Always keep an active visit — even if we skip a duplicate view ping.
    const isDuplicateView =
      (lastViewAt.get(key) ?? 0) > 0 &&
      now - (lastViewAt.get(key) ?? 0) < VIEW_DEDUPE_MS;

    if (!visitRef.current || visitRef.current.path !== key) {
      maxScrollRef.current = 0;
      visitRef.current = {
        path: key,
        enteredAtMs: now,
        pageLabel,
        activeAccumMs: 0,
        activeSegmentStartedAt:
          typeof document !== "undefined" &&
          document.visibilityState === "hidden"
            ? null
            : now,
      };
    }

    if (!isDuplicateView) {
      lastViewAt.set(key, now);
      track({
        path: key,
        sessionId,
        visitorId,
        eventType: "view",
        pageLabel,
        ...traffic,
      });
    }

    const hb = window.setInterval(() => {
      const v = visitRef.current;
      if (!v || v.path !== key) return;
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
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
        durationMs: activeDurationMs(v, Date.now()),
        keepAliveSession: true,
        ...traffic,
      });
    }, HEARTBEAT_MS);

    const onVisibility = () => {
      const current = visitRef.current;
      if (!current || current.path !== key) return;
      const t = Date.now();
      if (document.visibilityState === "hidden") {
        pauseActiveTime(current, t);
        // Soft ping — keeps Online true; does NOT end the visit.
        track({
          path: current.path,
          sessionId,
          visitorId,
          eventType: "heartbeat",
          pageLabel: current.pageLabel,
          interactionCount: interactionCountRef.current,
          maxScrollDepthPct: maxScrollRef.current,
          durationMs: activeDurationMs(current, t),
          keepAliveSession: true,
          ...traffic,
        });
      } else {
        resumeActiveTime(current, t);
        track({
          path: current.path,
          sessionId,
          visitorId,
          eventType: "heartbeat",
          pageLabel: current.pageLabel,
          interactionCount: interactionCountRef.current,
          maxScrollDepthPct: maxScrollRef.current,
          keepAliveSession: true,
          ...traffic,
        });
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    const onPageHide = () => {
      const current = visitRef.current;
      if (!current || current.path !== key) return;
      sendLeave(current);
    };
    window.addEventListener("pagehide", onPageHide);

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
    const CLICKABLE_SEL =
      "a,button,[role='button'],[role='menuitem'],[role='link'],[role='tab'],[data-analytics-click],summary,input[type='submit'],input[type='button'],label[for],nav a,header a,footer a";

    const onDocumentClick = (ev: MouseEvent) => {
      const target = ev.target;
      if (!(target instanceof Element)) return;
      // Ignore pure text selection / non-UI chrome
      if (target.closest("script,style,noscript,svg title")) return;

      let clickable = target.closest(CLICKABLE_SEL);
      // Cards / tiles: clickable parent with cursor-pointer + nested control intent
      if (!clickable) {
        const pointerish = target.closest(
          "[class*='cursor-pointer'],[onclick]",
        );
        if (
          pointerish instanceof Element &&
          pointerish.closest("main,header,nav,footer,aside,[role='dialog']")
        ) {
          clickable = pointerish;
        }
      }
      if (!(clickable instanceof Element)) return;
      // Don't record admin chrome if somehow mounted
      if (clickable.closest("[data-admin-shell]")) return;

      interactionCountRef.current += 1;

      const rawText =
        clickable instanceof HTMLAnchorElement ||
        clickable instanceof HTMLButtonElement
          ? clickable.innerText || clickable.textContent || ""
          : clickable.getAttribute("aria-label") ||
            clickable.textContent ||
            "";
      const clickLabel = rawText.replace(/\s+/g, " ").trim().slice(0, 140);
      if (!clickLabel && !(clickable instanceof HTMLAnchorElement)) {
        // Skip empty anonymous divs
        const hrefProbe =
          clickable instanceof HTMLAnchorElement
            ? clickable.getAttribute("href")
            : clickable.querySelector?.("a")?.getAttribute("href");
        if (!hrefProbe) return;
      }
      const clickTarget = clickable.tagName.toLowerCase();
      let clickHref = "";
      if (clickable instanceof HTMLAnchorElement) {
        clickHref = (clickable.getAttribute("href") || "").slice(0, 500);
      } else {
        const nested = clickable.querySelector?.("a[href]");
        if (nested) {
          clickHref = (nested.getAttribute("href") || "").slice(0, 500);
        }
      }

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
        eventId: newId("c"),
        eventType: "click",
        pageLabel: current?.pageLabel || pageLabel,
        clickLabel: clickLabel || clickHref || clickTarget,
        clickTarget,
        clickHref,
        clickCategory: classifyClick(clickHref, clickLabel, clickable),
        interactionCount: interactionCountRef.current,
        ...traffic,
      });
    };

    // Capture phase so we see the click before React stops propagation / navigates
    document.addEventListener("click", onDocumentClick, {
      capture: true,
      passive: true,
    });

    return () => {
      window.clearInterval(hb);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("click", onDocumentClick, true);
      // On SPA route change React cleans up before the next effect runs.
      // Leave for the previous path is sent at the start of the next effect.
    };
  }, [pathname]);

  return null;
}
