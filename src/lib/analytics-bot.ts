/**
 * Layered bot / automation classification for analytics v2.
 */

export type VisitorType =
  | "human"
  | "bot"
  | "suspected_bot"
  | "internal"
  | "unknown";

export type BotCategory =
  | "search_engine"
  | "ai_crawler"
  | "seo_crawler"
  | "social_preview"
  | "monitoring"
  | "headless"
  | "automation"
  | "unknown_bot"
  | "";

export type BotClassification = {
  visitorType: VisitorType;
  isBot: boolean;
  botName: string;
  botCategory: BotCategory;
  botReason: string;
  botConfidence: "high" | "medium" | "low" | "unknown";
  botSignals: string[];
};

const BOT_RULES: { re: RegExp; name: string; category: BotCategory }[] = [
  { re: /googlebot/i, name: "Googlebot", category: "search_engine" },
  { re: /google-inspectiontool/i, name: "Google-InspectionTool", category: "search_engine" },
  { re: /googleother/i, name: "GoogleOther", category: "search_engine" },
  { re: /adsbot-google/i, name: "AdsBot-Google", category: "search_engine" },
  { re: /mediapartners-google/i, name: "Mediapartners-Google", category: "search_engine" },
  { re: /bingbot/i, name: "Bingbot", category: "search_engine" },
  { re: /slurp/i, name: "Yahoo Slurp", category: "search_engine" },
  { re: /duckduckbot/i, name: "DuckDuckBot", category: "search_engine" },
  { re: /baiduspider/i, name: "Baiduspider", category: "search_engine" },
  { re: /yandexbot/i, name: "YandexBot", category: "search_engine" },
  { re: /applebot/i, name: "Applebot", category: "search_engine" },
  { re: /petalbot/i, name: "PetalBot", category: "search_engine" },
  { re: /gptbot/i, name: "GPTBot", category: "ai_crawler" },
  { re: /chatgpt-user/i, name: "ChatGPT-User", category: "ai_crawler" },
  { re: /claudebot|claude-web/i, name: "ClaudeBot", category: "ai_crawler" },
  { re: /perplexitybot/i, name: "PerplexityBot", category: "ai_crawler" },
  { re: /anthropic/i, name: "Anthropic", category: "ai_crawler" },
  { re: /bytespider/i, name: "Bytespider", category: "ai_crawler" },
  { re: /facebookexternalhit|facebot/i, name: "FacebookExternalHit", category: "social_preview" },
  { re: /twitterbot/i, name: "Twitterbot", category: "social_preview" },
  { re: /linkedinbot/i, name: "LinkedInBot", category: "social_preview" },
  { re: /pinterestbot/i, name: "Pinterestbot", category: "social_preview" },
  // Only link-preview crawlers — NOT WhatsApp/Telegram in-app browsers (real humans).
  { re: /^whatsapp\//i, name: "WhatsAppPreview", category: "social_preview" },
  { re: /telegrambot/i, name: "TelegramBot", category: "social_preview" },
  { re: /discordbot/i, name: "Discordbot", category: "social_preview" },
  { re: /slackbot/i, name: "Slackbot", category: "social_preview" },
  { re: /semrushbot/i, name: "SemrushBot", category: "seo_crawler" },
  { re: /ahrefsbot/i, name: "AhrefsBot", category: "seo_crawler" },
  { re: /mj12bot/i, name: "MJ12bot", category: "seo_crawler" },
  { re: /dotbot/i, name: "DotBot", category: "seo_crawler" },
  { re: /screaming frog/i, name: "Screaming Frog", category: "seo_crawler" },
  { re: /uptimerobot/i, name: "UptimeRobot", category: "monitoring" },
  { re: /pingdom/i, name: "Pingdom", category: "monitoring" },
  { re: /gtmetrix/i, name: "GTmetrix", category: "monitoring" },
  { re: /lighthouse/i, name: "Lighthouse", category: "monitoring" },
  { re: /pagespeed/i, name: "PageSpeed", category: "monitoring" },
  { re: /headlesschrome/i, name: "HeadlessChrome", category: "headless" },
  { re: /phantomjs/i, name: "PhantomJS", category: "headless" },
  { re: /selenium/i, name: "Selenium", category: "headless" },
  { re: /puppeteer/i, name: "Puppeteer", category: "headless" },
  { re: /playwright/i, name: "Playwright", category: "headless" },
  { re: /wget\b/i, name: "wget", category: "automation" },
  { re: /\bcurl\b/i, name: "curl", category: "automation" },
  { re: /python-requests/i, name: "python-requests", category: "automation" },
  { re: /go-http-client/i, name: "Go-http-client", category: "automation" },
  { re: /axios\//i, name: "axios", category: "automation" },
  { re: /okhttp/i, name: "okhttp", category: "automation" },
  { re: /postmanruntime/i, name: "Postman", category: "automation" },
  { re: /insomnia/i, name: "Insomnia", category: "automation" },
  { re: /\b(bot|spider|crawler)\b/i, name: "GenericBot", category: "unknown_bot" },
];

/** @deprecated use classifyBotFromUserAgent — kept for older call sites */
export const BOT_PATTERNS: RegExp[] = BOT_RULES.map((r) => r.re);

export function botLabelFromUserAgent(ua: string): string {
  const hit = BOT_RULES.find((r) => r.re.test(ua));
  return hit?.name ?? (ua.trim() ? "Automated client" : "Bot");
}

export function isBotUserAgent(ua: string): boolean {
  const u = ua.trim();
  if (!u) return true; // empty UA → treat as bot in v2
  return BOT_RULES.some((r) => r.re.test(u));
}

export function classifyBotFromUserAgent(ua: string): BotClassification {
  const u = ua.trim();
  const signals: string[] = [];
  if (!u) {
    return {
      visitorType: "bot",
      isBot: true,
      botName: "EmptyUA",
      botCategory: "unknown_bot",
      botReason: "Missing User-Agent header",
      botConfidence: "high",
      botSignals: ["empty_ua"],
    };
  }
  for (const rule of BOT_RULES) {
    if (rule.re.test(u)) {
      signals.push(`ua:${rule.name}`);
      return {
        visitorType: "bot",
        isBot: true,
        botName: rule.name,
        botCategory: rule.category,
        botReason: `User-Agent matched ${rule.name}`,
        botConfidence: "high",
        botSignals: signals,
      };
    }
  }
  return {
    visitorType: "unknown",
    isBot: false,
    botName: "",
    botCategory: "",
    botReason: "",
    botConfidence: "unknown",
    botSignals: [],
  };
}

/** Prefer stored flag; fall back to UA sniffing for older events. */
export function resolveIsBot(stored: unknown, uaSnippet: string): boolean {
  if (stored === true) return true;
  if (stored === false) return false;
  return isBotUserAgent(uaSnippet);
}

/**
 * Engagement / fingerprint heuristics for suspected automation.
 * Does not invent bots from geo alone.
 */
export function classifyEngagementSuspicion(input: {
  durationMs?: number | null;
  maxScrollDepthPct?: number | null;
  interactionCount?: number | null;
  deviceLabel?: string;
  claimedGoogleOrganic?: boolean;
  sourceConfidence?: string;
  hasRawReferrer?: boolean;
  secFetchDest?: string | null;
  purposePrefetch?: boolean;
}): { suspected: boolean; signals: string[]; reason: string } {
  const signals: string[] = [];
  const duration = input.durationMs ?? null;
  const scroll = input.maxScrollDepthPct ?? 0;
  const interactions = input.interactionCount ?? 0;
  const label = (input.deviceLabel ?? "").toLowerCase();

  // Only real prefetch/preview — NOT sec-fetch-dest:empty (normal for fetch/XHR).
  if (input.purposePrefetch) {
    signals.push("prefetch_or_empty_dest");
  }
  if (duration != null && duration < 1500) signals.push("sub_1_5s_duration");
  if (scroll <= 0 && interactions <= 0) signals.push("no_engagement");
  if (label.includes("linux") && label.includes("chrome") && label.includes("desktop")) {
    signals.push("linux_chrome_desktop");
  }
  if (
    input.claimedGoogleOrganic &&
    input.sourceConfidence !== "high" &&
    !input.hasRawReferrer
  ) {
    signals.push("google_without_referrer_evidence");
  }

  // Only treat as suspected when short + no engagement AND an automation-like signal.
  // Plain quick bounces (real humans who leave immediately) stay "unknown"/human in admin.
  const strong =
    signals.includes("sub_1_5s_duration") &&
    signals.includes("no_engagement") &&
    (signals.includes("linux_chrome_desktop") ||
      signals.includes("google_without_referrer_evidence") ||
      signals.includes("prefetch_or_empty_dest"));

  if (strong) {
    return {
      suspected: true,
      signals,
      reason: "Zero-engagement short visit with automation-like fingerprint",
    };
  }
  return { suspected: false, signals, reason: "" };
}
