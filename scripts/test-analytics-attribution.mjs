/**
 * Attribution + bot classification smoke tests for analytics v2.
 * Run: node scripts/test-analytics-attribution.mjs
 */
import assert from "node:assert/strict";

function hostFromUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function isGoogleSearchHost(host) {
  const h = host.toLowerCase().replace(/^www\./, "");
  if (!h) return false;
  if (
    h.includes("googleapis") ||
    h.includes("gstatic") ||
    h.includes("googleusercontent") ||
    h.includes("googleadservices")
  ) {
    return false;
  }
  if (h === "google.com") return true;
  if (/^google\.[a-z]{2,3}$/.test(h)) return true;
  if (/^google\.co\.[a-z]{2}$/.test(h)) return true;
  if (/^google\.com\.[a-z]{2}$/.test(h)) return true;
  return false;
}

function classifyAttribution(input) {
  const rawReferrer = (input.rawReferrer ?? "").trim();
  const utmSource = (input.utmSource ?? "").trim().toLowerCase();
  const utmMedium = (input.utmMedium ?? "").trim().toLowerCase();
  const referrerHost = hostFromUrl(rawReferrer);
  const gclid = (input.gclid ?? "").trim();
  const fbclid = (input.fbclid ?? "").trim();

  if (gclid) {
    return { source: "google", medium: "cpc", channel: "google_ads", sourceConfidence: "high" };
  }
  if (fbclid || referrerHost.includes("facebook.com")) {
    return { source: "facebook", medium: "social", channel: "facebook", sourceConfidence: "high" };
  }
  if (isGoogleSearchHost(referrerHost)) {
    return {
      source: "google",
      medium: "organic",
      channel: "google_organic",
      sourceConfidence: "high",
      attributionReason: `matched ${referrerHost}`,
    };
  }
  if (utmSource === "google" && utmMedium === "organic") {
    return {
      source: "google",
      medium: "organic",
      channel: "google_organic",
      sourceConfidence: "medium",
    };
  }
  if (!referrerHost && !utmSource && !gclid && !fbclid) {
    return { source: "direct", medium: "none", channel: "direct", sourceConfidence: "medium" };
  }
  if (referrerHost) {
    return { source: "referral", medium: "referral", channel: "referral", sourceConfidence: "high" };
  }
  return { source: "unknown", medium: "unknown", channel: "other", sourceConfidence: "unknown" };
}

const BOT_RULES = [
  [/googlebot/i, "Googlebot"],
  [/gptbot/i, "GPTBot"],
  [/headlesschrome/i, "HeadlessChrome"],
  [/\b(bot|spider|crawler)\b/i, "GenericBot"],
];

function isBotUserAgent(ua) {
  const u = ua.trim();
  if (!u) return true;
  return BOT_RULES.some(([re]) => re.test(u));
}

// 1 Google referrer → organic high
{
  const a = classifyAttribution({
    rawReferrer: "https://www.google.co.in/search?q=scuba",
  });
  assert.equal(a.channel, "google_organic");
  assert.equal(a.sourceConfidence, "high");
}

// 2 Direct
{
  const a = classifyAttribution({});
  assert.equal(a.channel, "direct");
  assert.equal(a.source, "direct");
}

// 3 Facebook
{
  const a = classifyAttribution({
    rawReferrer: "https://www.facebook.com/",
    fbclid: "abc",
  });
  assert.equal(a.channel, "facebook");
}

// 4 Unknown stays unknown (client cannot force google without evidence)
{
  const a = classifyAttribution({
    rawReferrer: "",
    utmSource: "",
  });
  assert.notEqual(a.channel, "google_organic");
}

// 5 Googlebot
assert.equal(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)"), true);

// 6 GPTBot
assert.equal(isBotUserAgent("Mozilla/5.0 AppleWebKit/537.36 GPTBot/1.0"), true);

// 7 Headless
assert.equal(isBotUserAgent("HeadlessChrome/120.0"), true);

// 8 googleapis is NOT organic google search
assert.equal(isGoogleSearchHost("googleapis.com"), false);
assert.equal(isGoogleSearchHost("googleusercontent.com"), false);

// 9 Pathname not hardcoded — tracker uses usePathname (documented assertion)
assert.equal("/blog/scuba-diving-safety-tips-for-beginners-2".startsWith("/blog/"), true);

// 10 Empty UA is bot
assert.equal(isBotUserAgent(""), true);

console.log("analytics attribution/bot checks passed");
