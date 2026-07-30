/**
 * Client-compatible traffic helpers. Server truth is `analytics-attribution.ts`.
 */
import {
  classifyAttribution,
  type AttributionChannel,
  type AttributionResult,
} from "@/lib/analytics-attribution";

export type TrafficChannel = AttributionChannel;

export type TrafficInfo = {
  channel: TrafficChannel;
  label: string;
  detail: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  landingPath: string;
  rawReferrer?: string;
  source?: string;
  medium?: string;
  sourceConfidence?: string;
  attributionReason?: string;
};

export function classifyTrafficSource(input: {
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  gclid?: string;
  fbclid?: string;
  landingPath?: string;
}): TrafficInfo {
  const a: AttributionResult = classifyAttribution({
    rawReferrer: input.referrer,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
    gclid: input.gclid,
    fbclid: input.fbclid,
    landingPath: input.landingPath,
  });
  return {
    channel: a.channel,
    label: a.label,
    detail: a.detail,
    referrerHost: a.referrerHost,
    utmSource: a.utmSource,
    utmMedium: a.utmMedium,
    utmCampaign: a.utmCampaign,
    landingPath: input.landingPath?.trim() || "/",
    rawReferrer: a.rawReferrer,
    source: a.source,
    medium: a.medium,
    sourceConfidence: a.sourceConfidence,
    attributionReason: a.attributionReason,
  };
}

export function trafficChannelStyles(channel: TrafficChannel | ""): string {
  switch (channel) {
    case "facebook":
      return "bg-blue-100 text-blue-900";
    case "instagram":
      return "bg-pink-100 text-pink-900";
    case "whatsapp":
      return "bg-emerald-100 text-emerald-900";
    case "youtube":
      return "bg-red-100 text-red-900";
    case "twitter":
      return "bg-sky-100 text-sky-900";
    case "linkedin":
      return "bg-indigo-100 text-indigo-900";
    case "tiktok":
      return "bg-zinc-200 text-zinc-900";
    case "google_ads":
      return "bg-amber-100 text-amber-900";
    case "google_organic":
      return "bg-green-100 text-green-900";
    case "bing":
      return "bg-teal-100 text-teal-900";
    case "direct":
      return "bg-slate-100 text-slate-800";
    case "email":
      return "bg-purple-100 text-purple-900";
    case "referral":
      return "bg-cyan-100 text-cyan-900";
    default:
      return "bg-ocean-100 text-ocean-900";
  }
}
