/**
 * Capture first-touch referrer + UTMs as early as possible.
 * Must run before SPA navigations strip query params (fbclid, utm_*).
 */
import { classifyTrafficSource } from "@/lib/analytics-traffic";

export const ANALYTICS_TRAFFIC_KEY = "bsg_analytics_traffic";

export type AnalyticsTrafficPayload = {
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

function emptyPayload(landingPath: string): AnalyticsTrafficPayload {
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

/** Read cached first-touch, or capture from the current document once. */
export function getOrCaptureAnalyticsTraffic(
  landingPath?: string,
): AnalyticsTrafficPayload {
  if (typeof window === "undefined") {
    return emptyPayload(landingPath || "/");
  }

  try {
    const cached = sessionStorage.getItem(ANALYTICS_TRAFFIC_KEY);
    if (cached) {
      return JSON.parse(cached) as AnalyticsTrafficPayload;
    }
  } catch {
    /* ignore */
  }

  const path =
    landingPath ||
    `${window.location.pathname}${window.location.search}` ||
    "/";
  const params = new URLSearchParams(window.location.search);
  const rawReferrer = document.referrer || "";
  const info = classifyTrafficSource({
    referrer: rawReferrer,
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    gclid: params.get("gclid") ?? undefined,
    fbclid: params.get("fbclid") ?? undefined,
    landingPath: path.split("?")[0] || "/",
  });

  const payload: AnalyticsTrafficPayload = {
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
    sessionStorage.setItem(ANALYTICS_TRAFFIC_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  return payload;
}

/** Fire-and-forget capture on first paint (before deferred tracker arms). */
export function captureAnalyticsFirstTouch(): void {
  if (typeof window === "undefined") return;
  const path = `${window.location.pathname}${window.location.search}` || "/";
  getOrCaptureAnalyticsTraffic(path);
}
