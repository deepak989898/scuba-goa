"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const SESSION_KEY = "bsg_analytics_sid";
/** Dedupe React Strict Mode double-invoke (same path within a few seconds). */
const lastTrackAt = new Map<string, number>();
const HEARTBEAT_MS = 30_000;

type EventType = "view" | "leave" | "heartbeat";

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

function track(
  payload: {
    path: string;
    sessionId: string;
    eventType: EventType;
    pageLabel?: string;
    enteredAtMs?: number;
    leftAtMs?: number;
    durationMs?: number;
  } & ReturnType<typeof clientContextPayload>
) {
  const body = JSON.stringify({ ...clientContextPayload(), ...payload });
  if (
    payload.eventType === "leave" &&
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function"
  ) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/analytics/track", blob);
    return;
  }
  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: payload.eventType === "leave",
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

    const hb = window.setInterval(() => {
      const v = visitRef.current;
      if (!v || v.path !== key) return;
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

    return () => {
      window.clearInterval(hb);
      document.removeEventListener("visibilitychange", onHidden);
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
