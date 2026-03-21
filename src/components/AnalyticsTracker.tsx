"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SESSION_KEY = "bsg_analytics_sid";
/** Dedupe React Strict Mode double-invoke (same path within a few seconds). */
const lastTrackAt = new Map<string, number>();

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

  useEffect(() => {
    if (!pathname.startsWith("/") || pathname.startsWith("/admin")) return;

    const key = pathname || "/";
    const now = Date.now();
    const prev = lastTrackAt.get(key) ?? 0;
    if (now - prev < 2500) return;
    lastTrackAt.set(key, now);

    const sessionId = getSessionId();
    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: key, sessionId }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
