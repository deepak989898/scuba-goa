/**
 * Server-authoritative traffic attribution for analytics v2.
 * Never trust a client-supplied trafficChannel without verifying referrer/UTM.
 */

export type AttributionSource =
  | "google"
  | "bing"
  | "facebook"
  | "instagram"
  | "whatsapp"
  | "youtube"
  | "twitter"
  | "linkedin"
  | "tiktok"
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

export type AttributionChannel =
  | "facebook"
  | "instagram"
  | "whatsapp"
  | "youtube"
  | "twitter"
  | "linkedin"
  | "tiktok"
  | "google_ads"
  | "google_organic"
  | "bing"
  | "direct"
  | "email"
  | "referral"
  | "other";

export type AttributionResult = {
  source: AttributionSource;
  medium: AttributionMedium;
  /** Legacy admin channel id (kept for UI compatibility). */
  channel: AttributionChannel;
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

const CHANNEL_LABELS: Record<AttributionChannel, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  youtube: "YouTube",
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  google_ads: "Google Ads",
  google_organic: "Google Search",
  bing: "Bing Search",
  direct: "Direct link",
  email: "Email",
  referral: "Referral",
  other: "Other",
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

function utmIncludes(utmSource: string, needle: string): boolean {
  return utmSource.includes(needle);
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
  if (
    gclid ||
    utmMedium === "cpc" ||
    utmMedium === "ppc" ||
    (utmSource === "google" && utmMedium === "paid")
  ) {
    return {
      ...base,
      source: "google",
      medium: "cpc",
      channel: "google_ads",
      label: CHANNEL_LABELS.google_ads,
      detail: utmCampaign || "Google Ads click",
      sourceConfidence: gclid ? "high" : "medium",
      attributionReason: gclid
        ? "gclid present"
        : `utm_medium=${utmMedium || "paid"}`,
    };
  }

  // 2) WhatsApp
  if (
    utmSource === "wa" ||
    utmIncludes(utmSource, "whatsapp") ||
    matchesHost(referrerHost, ["wa.me", "whatsapp.com", "api.whatsapp.com"])
  ) {
    return {
      ...base,
      source: "whatsapp",
      medium: "social",
      channel: "whatsapp",
      label: CHANNEL_LABELS.whatsapp,
      detail: referrerHost || utmSource || "WhatsApp link",
      sourceConfidence: referrerHost || utmSource ? "high" : "medium",
      attributionReason: referrerHost
        ? `document.referrer hostname matched ${referrerHost}`
        : `utm_source=${utmSource}`,
    };
  }

  // 3) Facebook
  if (
    fbclid ||
    utmSource === "fb" ||
    utmIncludes(utmSource, "facebook") ||
    matchesHost(referrerHost, [
      "facebook.com",
      "fb.com",
      "m.facebook.com",
      "l.facebook.com",
      "lm.facebook.com",
    ])
  ) {
    return {
      ...base,
      source: "facebook",
      medium: "social",
      channel: "facebook",
      label: CHANNEL_LABELS.facebook,
      detail: referrerHost || utmCampaign || utmSource || "Facebook",
      sourceConfidence: fbclid || referrerHost ? "high" : "medium",
      attributionReason: fbclid
        ? "fbclid present"
        : referrerHost
          ? `document.referrer hostname matched ${referrerHost}`
          : `utm_source=${utmSource}`,
    };
  }

  // 4) Instagram
  if (
    utmSource === "ig" ||
    utmIncludes(utmSource, "instagram") ||
    matchesHost(referrerHost, ["instagram.com", "l.instagram.com"])
  ) {
    return {
      ...base,
      source: "instagram",
      medium: "social",
      channel: "instagram",
      label: CHANNEL_LABELS.instagram,
      detail: referrerHost || utmCampaign || utmSource || "Instagram",
      sourceConfidence: referrerHost ? "high" : "medium",
      attributionReason: referrerHost
        ? `document.referrer hostname matched ${referrerHost}`
        : `utm_source=${utmSource}`,
    };
  }

  // 5) YouTube
  if (
    utmSource === "yt" ||
    utmIncludes(utmSource, "youtube") ||
    matchesHost(referrerHost, ["youtube.com", "youtu.be", "m.youtube.com"])
  ) {
    return {
      ...base,
      source: "youtube",
      medium: "social",
      channel: "youtube",
      label: CHANNEL_LABELS.youtube,
      detail: referrerHost || utmSource || "YouTube",
      sourceConfidence: referrerHost ? "high" : "medium",
      attributionReason: referrerHost
        ? `document.referrer hostname matched ${referrerHost}`
        : `utm_source=${utmSource}`,
    };
  }

  // 6) X / Twitter
  if (
    utmIncludes(utmSource, "twitter") ||
    utmIncludes(utmSource, "x.com") ||
    utmSource === "x" ||
    matchesHost(referrerHost, ["twitter.com", "x.com", "t.co"])
  ) {
    return {
      ...base,
      source: "twitter",
      medium: "social",
      channel: "twitter",
      label: CHANNEL_LABELS.twitter,
      detail: referrerHost || utmSource || "X / Twitter",
      sourceConfidence: referrerHost ? "high" : "medium",
      attributionReason: referrerHost
        ? `document.referrer hostname matched ${referrerHost}`
        : `utm_source=${utmSource}`,
    };
  }

  // 7) LinkedIn
  if (
    utmIncludes(utmSource, "linkedin") ||
    matchesHost(referrerHost, ["linkedin.com", "lnkd.in"])
  ) {
    return {
      ...base,
      source: "linkedin",
      medium: "social",
      channel: "linkedin",
      label: CHANNEL_LABELS.linkedin,
      detail: referrerHost || utmSource || "LinkedIn",
      sourceConfidence: referrerHost ? "high" : "medium",
      attributionReason: referrerHost
        ? `document.referrer hostname matched ${referrerHost}`
        : `utm_source=${utmSource}`,
    };
  }

  // 8) TikTok
  if (
    utmIncludes(utmSource, "tiktok") ||
    matchesHost(referrerHost, ["tiktok.com", "vm.tiktok.com"])
  ) {
    return {
      ...base,
      source: "tiktok",
      medium: "social",
      channel: "tiktok",
      label: CHANNEL_LABELS.tiktok,
      detail: referrerHost || utmSource || "TikTok",
      sourceConfidence: referrerHost ? "high" : "medium",
      attributionReason: referrerHost
        ? `document.referrer hostname matched ${referrerHost}`
        : `utm_source=${utmSource}`,
    };
  }

  // 9) Google organic — requires real Google search host OR explicit organic UTM
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
  if (utmSource === "google" && (utmMedium === "organic" || !utmMedium)) {
    return {
      ...base,
      source: "google",
      medium: "organic",
      channel: "google_organic",
      label: CHANNEL_LABELS.google_organic,
      detail: utmMedium ? "utm google/organic" : "utm_source=google",
      sourceConfidence: "medium",
      attributionReason: utmMedium
        ? "utm_source=google and utm_medium=organic"
        : "utm_source=google",
    };
  }

  // 10) Bing
  if (
    matchesHost(referrerHost, ["bing.com"]) ||
    (utmSource === "bing" && (utmMedium === "organic" || !utmMedium))
  ) {
    return {
      ...base,
      source: "bing",
      medium: "organic",
      channel: "bing",
      label: CHANNEL_LABELS.bing,
      detail: referrerHost || "Bing search",
      sourceConfidence: referrerHost ? "high" : "medium",
      attributionReason: referrerHost
        ? `document.referrer hostname matched ${referrerHost}`
        : `utm_source=${utmSource}`,
    };
  }

  // 11) Email
  if (
    utmMedium === "email" ||
    utmSource === "email" ||
    utmSource === "newsletter"
  ) {
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

  // 12) Other campaign UTMs
  if (utmSource && utmMedium) {
    const pretty = [utmSource, utmMedium, utmCampaign]
      .filter(Boolean)
      .join(" · ");
    return {
      ...base,
      source: "campaign",
      medium: utmMedium === "cpc" || utmMedium === "ppc" ? "cpc" : "unknown",
      channel: "other",
      label: CHANNEL_LABELS.other,
      detail: pretty,
      sourceConfidence: "medium",
      attributionReason: `utm_source=${utmSource} utm_medium=${utmMedium}`,
    };
  }
  if (utmSource) {
    return {
      ...base,
      source: "campaign",
      medium: "unknown",
      channel: "other",
      label: CHANNEL_LABELS.other,
      detail: utmCampaign ? `${utmSource} · ${utmCampaign}` : utmSource,
      sourceConfidence: "medium",
      attributionReason: `utm_source=${utmSource}`,
    };
  }

  // 13) Direct — typed URL, bookmark, or privacy-stripped referrer
  if (!referrerHost && !utmSource && !gclid && !fbclid) {
    return {
      ...base,
      source: "direct",
      medium: "none",
      channel: "direct",
      label: CHANNEL_LABELS.direct,
      detail: "Typed URL, bookmark, or app with no referrer",
      sourceConfidence: "medium",
      attributionReason: "no referrer and no campaign parameters",
    };
  }

  // 14) Referral from another website
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

  // 15) Unknown — never promote to Google
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

/** Map a stored source string to a display label when trafficLabel is missing. */
export function labelFromAttributionSource(source: string | undefined): string {
  switch ((source ?? "").toLowerCase()) {
    case "google":
      return CHANNEL_LABELS.google_organic;
    case "bing":
      return CHANNEL_LABELS.bing;
    case "facebook":
      return CHANNEL_LABELS.facebook;
    case "instagram":
      return CHANNEL_LABELS.instagram;
    case "whatsapp":
      return CHANNEL_LABELS.whatsapp;
    case "youtube":
      return CHANNEL_LABELS.youtube;
    case "twitter":
      return CHANNEL_LABELS.twitter;
    case "linkedin":
      return CHANNEL_LABELS.linkedin;
    case "tiktok":
      return CHANNEL_LABELS.tiktok;
    case "direct":
      return CHANNEL_LABELS.direct;
    case "email":
      return CHANNEL_LABELS.email;
    case "referral":
      return CHANNEL_LABELS.referral;
    case "campaign":
      return CHANNEL_LABELS.other;
    default:
      return "";
  }
}
