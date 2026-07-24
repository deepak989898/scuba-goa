/** Browser session / visitor IDs shared by AnalyticsTracker + marketing leads. */

export const ANALYTICS_SESSION_KEY = "bsg_analytics_sid";
export const ANALYTICS_VISITOR_KEY = "bsg_analytics_vid";

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/** Same session id the site analytics tracker uses (creates one if missing). */
export function getOrCreateAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(ANALYTICS_SESSION_KEY);
    if (!id) {
      id = newId("s");
      sessionStorage.setItem(ANALYTICS_SESSION_KEY, id);
    }
    return id;
  } catch {
    return newId("s");
  }
}

export function getOrCreateAnalyticsVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(ANALYTICS_VISITOR_KEY);
    if (!id) {
      id = newId("v");
      localStorage.setItem(ANALYTICS_VISITOR_KEY, id);
    }
    return id;
  } catch {
    return newId("v");
  }
}
