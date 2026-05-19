/**
 * Detect crawlers, monitors, and automated clients from User-Agent.
 * Used when ingesting analytics and when classifying older records in admin.
 */

const BOT_PATTERNS: RegExp[] = [
  /googlebot/i,
  /google-inspectiontool/i,
  /adsbot-google/i,
  /mediapartners-google/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /applebot/i,
  /facebookexternalhit/i,
  /facebot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /pinterestbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
  /slackbot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /screaming frog/i,
  /uptimerobot/i,
  /pingdom/i,
  /gtmetrix/i,
  /lighthouse/i,
  /pagespeed/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /wget\b/i,
  /\bcurl\b/i,
  /python-requests/i,
  /go-http-client/i,
  /java\/[\d.]+.*http/i,
  /libwww-perl/i,
  /axios\//i,
  /okhttp/i,
  /postmanruntime/i,
  /insomnia/i,
  /\b(bot|spider|crawl)\b/i,
];

/** Short label for admin UI (e.g. "Googlebot"). */
export function botLabelFromUserAgent(ua: string): string {
  const u = ua.trim();
  if (!u) return "Bot";
  const rules: [RegExp, string][] = [
    [/googlebot/i, "Googlebot"],
    [/bingbot/i, "Bingbot"],
    [/facebookexternalhit|facebot/i, "Facebook crawler"],
    [/twitterbot/i, "Twitter bot"],
    [/linkedinbot/i, "LinkedIn bot"],
    [/lighthouse/i, "Lighthouse"],
    [/pagespeed/i, "PageSpeed"],
    [/uptimerobot/i, "UptimeRobot"],
    [/pingdom/i, "Pingdom"],
    [/semrushbot/i, "Semrush"],
    [/ahrefsbot/i, "Ahrefs"],
    [/headlesschrome/i, "Headless Chrome"],
    [/puppeteer/i, "Puppeteer"],
    [/playwright/i, "Playwright"],
    [/curl\b/i, "curl"],
    [/wget\b/i, "wget"],
    [/python-requests/i, "Python script"],
  ];
  for (const [re, label] of rules) {
    if (re.test(u)) return label;
  }
  const m = /\b([\w-]*bot[\w-]*)\b/i.exec(u);
  if (m?.[1]) return m[1].slice(0, 48);
  return "Automated client";
}

export function isBotUserAgent(ua: string): boolean {
  const u = ua.trim();
  if (!u) return false;
  return BOT_PATTERNS.some((re) => re.test(u));
}

/** Prefer stored flag; fall back to UA sniffing for older events. */
export function resolveIsBot(stored: unknown, uaSnippet: string): boolean {
  if (stored === true) return true;
  if (stored === false) return false;
  return isBotUserAgent(uaSnippet);
}
