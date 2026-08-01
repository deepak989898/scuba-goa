/** Additive Firestore collection names for SEO Intelligence (never overwrite GSC collections). */
export const SEO_INTEL_COLLECTIONS = {
  competitors: "seoCompetitors",
  keywords: "seoKeywords",
  rankSnapshots: "seoRankSnapshots",
  suggestions: "seoSuggestions",
  changeVersions: "seoChangeVersions",
  settings: "seoAgentSettings",
  activityLogs: "seoActivityLogs",
  jobLocks: "seoIntelJobLocks",
} as const;

export const SEO_INTEL_SETTINGS_DOC = "settings";

/** Large portals shown separately from local direct competitors. */
export const SEO_INTEL_MARKETPLACE_DOMAINS = [
  "tripadvisor.com",
  "tripadvisor.in",
  "makemytrip.com",
  "thrillophilia.com",
  "getyourguide.com",
  "viator.com",
  "klook.com",
  "booking.com",
  "expedia.com",
  "holidify.com",
  "traveltriangle.com",
  "headout.com",
] as const;

export const SEO_INTEL_EXCLUDED_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "tiktok.com",
  "pinterest.com",
  "wikipedia.org",
  "wiktionary.org",
  "google.com",
  "maps.google.com",
  "play.google.com",
  "apple.com",
  "reddit.com",
  "quora.com",
  "dictionary.com",
  "cambridge.org",
  "merriam-webster.com",
] as const;

export const SEO_INTEL_OWN_DOMAINS = [
  "bookscubagoa.com",
  "www.bookscubagoa.com",
] as const;
