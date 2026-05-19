/** How a visitor arrived — used in admin analytics. */
export type TrafficChannel =
  | "facebook"
  | "instagram"
  | "google_ads"
  | "google_organic"
  | "bing"
  | "direct"
  | "email"
  | "referral"
  | "other";

export type TrafficInfo = {
  channel: TrafficChannel;
  label: string;
  detail: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  landingPath: string;
};

const CHANNEL_LABELS: Record<TrafficChannel, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  google_ads: "Google Ads",
  google_organic: "Google (search)",
  bing: "Bing",
  direct: "Direct link",
  email: "Email",
  referral: "Other website",
  other: "Other",
};

function hostFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function matchesHost(host: string, patterns: string[]): boolean {
  const h = host.toLowerCase();
  return patterns.some((p) => h === p || h.endsWith(`.${p}`));
}

/**
 * Classify visit source from referrer + UTM params (first page load of session).
 */
export function classifyTrafficSource(input: {
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  gclid?: string;
  fbclid?: string;
  landingPath?: string;
}): TrafficInfo {
  const utmSource = (input.utmSource ?? "").trim().toLowerCase();
  const utmMedium = (input.utmMedium ?? "").trim().toLowerCase();
  const utmCampaign = (input.utmCampaign ?? "").trim();
  const referrerHost = hostFromUrl(input.referrer ?? "");
  const landingPath = (input.landingPath ?? "").trim() || "/";
  const gclid = (input.gclid ?? "").trim();
  const fbclid = (input.fbclid ?? "").trim();

  let channel: TrafficChannel = "other";
  let detail = "";

  if (fbclid || matchesHost(referrerHost, ["facebook.com", "fb.com", "m.facebook.com"])) {
    channel = "facebook";
    detail = utmCampaign || utmSource || referrerHost || "Facebook";
  } else if (
    utmSource.includes("instagram") ||
    utmSource.includes("ig") ||
    matchesHost(referrerHost, ["instagram.com", "l.instagram.com"])
  ) {
    channel = "instagram";
    detail = utmCampaign || utmSource || referrerHost || "Instagram";
  } else if (
    gclid ||
    utmMedium === "cpc" ||
    utmMedium === "ppc" ||
    utmSource === "google" && (utmMedium === "cpc" || utmMedium === "paid")
  ) {
    channel = "google_ads";
    detail = utmCampaign || "Google Ads";
  } else if (
    matchesHost(referrerHost, ["google.com", "google.co.in", "google.co.uk"]) ||
    utmSource === "google" && utmMedium === "organic"
  ) {
    channel = "google_organic";
    detail = referrerHost ? `from ${referrerHost}` : "Google search";
  } else if (matchesHost(referrerHost, ["bing.com"])) {
    channel = "bing";
    detail = "Bing search";
  } else if (utmMedium === "email" || utmSource === "email" || utmSource === "newsletter") {
    channel = "email";
    detail = utmCampaign || utmSource || "Email";
  } else if (!referrerHost && !utmSource && !gclid && !fbclid) {
    channel = "direct";
    detail = "Typed URL or bookmark";
  } else if (referrerHost) {
    channel = "referral";
    detail = referrerHost;
  } else if (utmSource) {
    channel = "other";
    detail = [utmSource, utmMedium, utmCampaign].filter(Boolean).join(" · ") || utmSource;
  } else {
    channel = "other";
    detail = "Unknown";
  }

  return {
    channel,
    label: CHANNEL_LABELS[channel],
    detail,
    referrerHost,
    utmSource: input.utmSource?.trim() ?? "",
    utmMedium: input.utmMedium?.trim() ?? "",
    utmCampaign,
    landingPath,
  };
}

/** Badge color classes per channel for admin UI */
export function trafficChannelStyles(channel: TrafficChannel | ""): string {
  switch (channel) {
    case "facebook":
      return "bg-blue-100 text-blue-900";
    case "instagram":
      return "bg-pink-100 text-pink-900";
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
