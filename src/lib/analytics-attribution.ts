/**
 * Server-authoritative traffic attribution for analytics v2.
 * Never trust a client-supplied trafficChannel without verifying referrer/UTM.
 */

export type AttributionSource =
  | "google"
  | "bing"
  | "facebook"
  | "instagram"
  | "direct"
  | "email"
  | "referral"
  | "campaign"
  | "unknown";

export type AttributionMedium =
  | "organic"
  | "cpc"
  | "social"
  | "email"
  | "referral"
  | "none"
  | "unknown";

export type SourceConfidence = "high" | "medium" | "low" | "unknown";

export type AttributionResult = {
  source: AttributionSource;
  medium: AttributionMedium;
  /** Legacy admin channel id (kept for UI compatibility). */
  channel:
    | "facebook"
    | "instagram"
    | "google_ads"
    | "google_organic"
    | "bing"
    | "direct"
    | "email"
    | "referral"
    | "other";
  label: string;
  detail: string;
  rawReferrer: string;
  referrerHost: string;
  landingUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  sourceConfidence: SourceConfidence;
  attributionReason: string;
};

const CHANNEL_LABELS: Record<AttributionResult["channel"], string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  google_ads: "Google Ads",
  google_organic: "Google (search)",
  bing: "Bing",
  direct: "Direct",
  email: "Email",
  referral: "Referral",
  other: "Unknown",
};

export function hostFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Genuine Google *search* hosts only — not APIs, ads, or usercontent CDNs. */
export function isGoogleSearchHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  if (!h) return false;
  if (
    h.includes("googleapis") ||
    h.includes("gstatic") ||
    h.includes("googleusercontent") ||
    h.includes("googleadservices") ||
    h.includes("doubleclick") ||
    h.includes("googlesyndication") ||
    h.includes("google-analytics") ||
    h.includes("googletagmanager")
  ) {
    return false;
  }
  if (h === "google.com") return true;
  if (/^google\.[a-z]{2,3}$/.test(h)) return true;
  if (/^google\.co\.[a-z]{2}$/.test(h)) return true;
  if (/^google\.com\.[a-z]{2}$/.test(h)) return true;
  return false;
}

function matchesHost(host: string, patterns: string[]): boolean {
  const h = host.toLowerCase();
  return patterns.some((p) => h === p || h.endsWith(`.${p}`));
}

/**
 * Classify using raw referrer + UTM. Prefer this on the server.
 * Does not invent Google organic without evidence.
 */
export function classifyAttribution(input: {
  rawReferrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  gclid?: string;
  fbclid?: string;
  landingPath?: string;
  landingUrl?: string;
}): AttributionResult {
  const rawReferrer = (input.rawReferrer ?? "").trim().slice(0, 500);
  const utmSource = (input.utmSource ?? "").trim().toLowerCase();
  const utmMedium = (input.utmMedium ?? "").trim().toLowerCase();
  const utmCampaign = (input.utmCampaign ?? "").trim().slice(0, 200);
  const referrerHost = hostFromUrl(rawReferrer);
  const landingPath = (input.landingPath ?? "").trim() || "/";
  const landingUrl = (input.landingUrl ?? landingPath).trim().slice(0, 500);
  const gclid = (input.gclid ?? "").trim();
  const fbclid = (input.fbclid ?? "").trim();

  const base = {
    rawReferrer,
    referrerHost,
    landingUrl,
    utmSource: (input.utmSource ?? "").trim(),
    utmMedium: (input.utmMedium ?? "").trim(),
    utmCampaign,
  };

  // 1) Paid Google
  if (gclid || utmMedium === "cpc" || utmMedium === "ppc" || (utmSource === "google" && utmMedium === "paid")) {
    return {
      ...base,
      source: "google",
      medium: "cpc",
      channel: "google_ads",
      label: CHANNEL_LABELS.google_ads,
      detail: utmCampaign || "Google Ads",
      sourceConfidence: gclid ? "high" : "medium",
      attributionReason: gclid
        ? "gclid present"
        : `utm_medium=${utmMedium || "paid"}`,
    };
  }

  // 2) Facebook / Instagram
  if (fbclid || matchesHost(referrerHost, ["facebook.com", "fb.com", "m.facebook.com", "l.facebook.com"])) {
    return {
      ...base,
      source: "facebook",
      medium: "social",
      channel: "facebook",
      label: CHANNEL_LABELS.facebook,
      detail: referrerHost || "Facebook",
      sourceConfidence: fbclid || referrerHost ? "high" : "medium",
      attributionReason: fbclid
        ? "fbclid present"
        : `document.referrer hostname matched ${referrerHost}`,
    };
  }
  if (
    utmSource.includes("instagram") ||
    matchesHost(referrerHost, ["instagram.com", "l.instagram.com"])
  ) {
    return {
      ...base,
      source: "instagram",
      medium: "social",
      channel: "instagram",
      label: CHANNEL_LABELS.instagram,
      detail: referrerHost || utmSource || "Instagram",
      sourceConfidence: referrerHost ? "high" : "medium",
      attributionReason: referrerHost
        ? `document.referrer hostname matched ${referrerHost}`
        : `utm_source=${utmSource}`,
    };
  }

  // 3) Google organic — requires real Google search host OR explicit organic UTM
  if (isGoogleSearchHost(referrerHost)) {
    return {
      ...base,
      source: "google",
      medium: "organic",
      channel: "google_organic",
      label: CHANNEL_LABELS.google_organic,
      detail: `from ${referrerHost}`,
      sourceConfidence: "high",
      attributionReason: `document.referrer hostname matched ${referrerHost}`,
    };
  }
  if (utmSource === "google" && utmMedium === "organic") {
    return {
      ...base,
      source: "google",
      medium: "organic",
      channel: "google_organic",
      label: CHANNEL_LABELS.google_organic,
      detail: "utm google/organic",
      sourceConfidence: "medium",
      attributionReason: "utm_source=google and utm_medium=organic",
    };
  }

  // 4) Bing
  if (matchesHost(referrerHost, ["bing.com"])) {
    return {
      ...base,
      source: "bing",
      medium: "organic",
      channel: "bing",
      label: CHANNEL_LABELS.bing,
      detail: "Bing search",
      sourceConfidence: "high",
      attributionReason: `document.referrer hostname matched ${referrerHost}`,
    };
  }

  // 5) Email
  if (utmMedium === "email" || utmSource === "email" || utmSource === "newsletter") {
    return {
      ...base,
      source: "email",
      medium: "email",
      channel: "email",
      label: CHANNEL_LABELS.email,
      detail: utmCampaign || utmSource || "Email",
      sourceConfidence: "medium",
      attributionReason: `utm email (${utmSource}/${utmMedium})`,
    };
  }

  // 6) Other campaign UTMs
  if (utmSource && utmMedium) {
    return {
      ...base,
      source: "campaign",
      medium: utmMedium === "cpc" || utmMedium === "ppc" ? "cpc" : "unknown",
      channel: "other",
      label: CHANNEL_LABELS.other,
      detail: [utmSource, utmMedium, utmCampaign].filter(Boolean).join(" · "),
      sourceConfidence: "medium",
      attributionReason: `utm_source=${utmSource} utm_medium=${utmMedium}`,
    };
  }

  // 7) Direct
  if (!referrerHost && !utmSource && !gclid && !fbclid) {
    return {
      ...base,
      source: "direct",
      medium: "none",
      channel: "direct",
      label: CHANNEL_LABELS.direct,
      detail: "Typed URL, bookmark, or missing referrer",
      sourceConfidence: "medium",
      attributionReason: "no referrer and no campaign parameters",
    };
  }

  // 8) Referral
  if (referrerHost) {
    return {
      ...base,
      source: "referral",
      medium: "referral",
      channel: "referral",
      label: CHANNEL_LABELS.referral,
      detail: referrerHost,
      sourceConfidence: "high",
      attributionReason: `document.referrer hostname ${referrerHost}`,
    };
  }

  // 9) Unknown — never promote to Google
  return {
    ...base,
    source: "unknown",
    medium: "unknown",
    channel: "other",
    label: CHANNEL_LABELS.other,
    detail: "Insufficient attribution evidence",
    sourceConfidence: "unknown",
    attributionReason: "could not reliably identify source",
  };
}
