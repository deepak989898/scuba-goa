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

/** High-contrast badges so each source is obvious in admin. */
export function trafficChannelStyles(channel: TrafficChannel | ""): string {
  switch (channel) {
    case "facebook":
      return "bg-[#1877F2] text-white ring-1 ring-[#1877F2]/90";
    case "instagram":
      return "bg-[#E1306C] text-white ring-1 ring-[#C13584]/90";
    case "whatsapp":
      return "bg-[#128C7E] text-white ring-1 ring-[#075E54]/90";
    case "youtube":
      return "bg-[#FF0000] text-white ring-1 ring-red-800/80";
    case "twitter":
      return "bg-[#0F1419] text-white ring-1 ring-zinc-700";
    case "linkedin":
      return "bg-[#0A66C2] text-white ring-1 ring-sky-900/50";
    case "tiktok":
      return "bg-zinc-900 text-[#69C9D0] ring-1 ring-zinc-700";
    case "google_ads":
      return "bg-amber-500 text-amber-950 ring-1 ring-amber-700/60";
    case "google_organic":
      return "bg-green-600 text-white ring-1 ring-green-800/70";
    case "bing":
      return "bg-teal-600 text-white ring-1 ring-teal-900/50";
    case "direct":
      return "bg-slate-600 text-white ring-1 ring-slate-800/70";
    case "email":
      return "bg-violet-600 text-white ring-1 ring-violet-900/50";
    case "referral":
      return "bg-cyan-600 text-white ring-1 ring-cyan-900/50";
    case "other":
      return "bg-orange-500 text-white ring-1 ring-orange-800/60";
    default:
      return "bg-ocean-700 text-white ring-1 ring-ocean-900/50";
  }
}

export function trafficChannelFromLabel(
  label: string | undefined,
): TrafficChannel | "" {
  const l = (label ?? "").trim().toLowerCase();
  if (!l || l === "—" || l === "not recorded") return "";
  if (l.includes("facebook")) return "facebook";
  if (l.includes("instagram")) return "instagram";
  if (l.includes("whatsapp")) return "whatsapp";
  if (l.includes("youtube")) return "youtube";
  if (l.includes("twitter") || l === "x" || l.startsWith("x /")) return "twitter";
  if (l.includes("linkedin")) return "linkedin";
  if (l.includes("tiktok")) return "tiktok";
  if (l.includes("google ads") || l.includes("google ad")) return "google_ads";
  if (l.includes("google")) return "google_organic";
  if (l.includes("bing")) return "bing";
  if (l.includes("direct")) return "direct";
  if (l.includes("email")) return "email";
  if (l.includes("referral")) return "referral";
  if (l.includes("bot")) return "other";
  return "other";
}
