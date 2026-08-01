import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import {
  SEO_INTEL_COLLECTIONS,
  SEO_INTEL_SETTINGS_DOC,
} from "./collections";
import type {
  SeoIntelAgentSettings,
  SeoIntelRiskLevel,
  SeoIntelSuggestionAutoType,
} from "./types";
import { SEO_INTEL_DANGEROUS_AUTO_TYPES } from "./types";

const DISCLAIMER =
  "Ranking impact is not guaranteed. Results vary with seasonality and algorithm updates." as const;

export function defaultSeoIntelSettings(): SeoIntelAgentSettings {
  const now = new Date().toISOString();
  return {
    id: "settings",
    competitorAutoDiscovery: true,
    competitorAutoApprove: false,
    competitorAutoApproveMinConfidence:
      Number(process.env.SEO_MIN_AUTO_APPROVE_CONFIDENCE ?? 85) || 85,
    suggestionAutoApprove: false,
    allowedAutoApproveTypes: [],
    dangerousActionSettings: Object.fromEntries(
      SEO_INTEL_DANGEROUS_AUTO_TYPES.map((t) => [t, false]),
    ),
    minConfidence:
      Number(process.env.SEO_MIN_AUTO_APPROVE_CONFIDENCE ?? 85) || 85,
    maxRisk: "low",
    minGscImpressions: 20,
    minBusinessRelevance: 50,
    dailyChangeLimit: Number(process.env.SEO_MAX_DAILY_CHANGES ?? 10) || 10,
    weeklyPageLimit: Number(process.env.SEO_MAX_WEEKLY_NEW_PAGES ?? 3) || 3,
    maxAiCostPerDay: 5,
    provider: process.env.SERPER_API_KEY?.trim() || process.env.SERP_API_KEY?.trim()
      ? "serper"
      : "none",
    serpLocation:
      process.env.SERP_LOCATION?.trim() || "Goa,India",
    serpCountry: process.env.SERP_COUNTRY?.trim() || "IN",
    serpLanguage: process.env.SERP_LANGUAGE?.trim() || "en",
    automationPaused: false,
    schedule: {
      dailyEnabled: true,
      weeklyEnabled: true,
      monthlyEnabled: true,
    },
    notificationSettings: {
      newCompetitor: true,
      highValueKeyword: true,
      rankingDrop: true,
      suggestionPending: true,
      autoApprovedApplied: true,
      changeFailed: true,
    },
    disclaimer: DISCLAIMER,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getSeoIntelSettings(): Promise<SeoIntelAgentSettings> {
  const db = getAdminDb();
  const defaults = defaultSeoIntelSettings();
  if (!db) return defaults;
  try {
    const snap = await db
      .collection(SEO_INTEL_COLLECTIONS.settings)
      .doc(SEO_INTEL_SETTINGS_DOC)
      .get();
    if (!snap.exists) return defaults;
    const d = snap.data() as Partial<SeoIntelAgentSettings>;
    return {
      ...defaults,
      ...d,
      id: "settings",
      schedule: { ...defaults.schedule, ...(d.schedule ?? {}) },
      notificationSettings: {
        ...defaults.notificationSettings,
        ...(d.notificationSettings ?? {}),
      },
      dangerousActionSettings: {
        ...defaults.dangerousActionSettings,
        ...(d.dangerousActionSettings ?? {}),
      },
      allowedAutoApproveTypes: Array.isArray(d.allowedAutoApproveTypes)
        ? d.allowedAutoApproveTypes
        : defaults.allowedAutoApproveTypes,
      disclaimer: DISCLAIMER,
      // Default OFF unless admin explicitly saved true (env alone never enables it).
      suggestionAutoApprove: d.suggestionAutoApprove === true,
      competitorAutoApprove: d.competitorAutoApprove === true,
    };
  } catch {
    return defaults;
  }
}

export async function saveSeoIntelSettings(
  patch: Partial<SeoIntelAgentSettings>,
): Promise<SeoIntelAgentSettings> {
  const db = getAdminDb();
  const current = await getSeoIntelSettings();
  const next: SeoIntelAgentSettings = {
    ...current,
    ...patch,
    id: "settings",
    schedule: { ...current.schedule, ...(patch.schedule ?? {}) },
    notificationSettings: {
      ...current.notificationSettings,
      ...(patch.notificationSettings ?? {}),
    },
    dangerousActionSettings: {
      ...current.dangerousActionSettings,
      ...(patch.dangerousActionSettings ?? {}),
    },
    disclaimer: DISCLAIMER,
    updatedAt: new Date().toISOString(),
    createdAt: current.createdAt || new Date().toISOString(),
  };
  if (db) {
    await db
      .collection(SEO_INTEL_COLLECTIONS.settings)
      .doc(SEO_INTEL_SETTINGS_DOC)
      .set(stripUndefinedDeep(next), { merge: true });
  }
  return next;
}

const RISK_RANK: Record<SeoIntelRiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function mapSuggestionTypeToAutoType(
  type: string,
): SeoIntelSuggestionAutoType | null {
  const map: Record<string, SeoIntelSuggestionAutoType> = {
    update_seo_title: "title",
    update_meta_description: "meta_description",
    add_internal_links: "internal_links",
    add_faqs: "faq_additions",
    improve_image_alt: "image_alt",
    add_faq_schema: "schema",
    add_service_schema: "schema",
    add_offer_schema: "schema",
    add_breadcrumb_schema: "schema",
    add_local_business_schema: "schema",
    expand_content: "content_expansion",
    create_blog: "new_blog",
    create_service_page: "new_service_page",
    improve_url: "url_changes",
    consolidate_pages: "page_consolidation",
    fix_canonical: "canonical_changes",
  };
  return map[type] ?? null;
}

/**
 * Auto-approve is OFF by default. Dangerous actions never auto-approve
 * unless explicitly enabled in dangerousActionSettings.
 */
export function canAutoApproveSuggestion(input: {
  settings: SeoIntelAgentSettings;
  suggestionType: string;
  confidence: number;
  risk: SeoIntelRiskLevel;
  impressions?: number | null;
  businessRelevance?: number | null;
  changesAppliedToday: number;
}): { ok: boolean; reason: string } {
  const { settings } = input;
  if (settings.automationPaused) {
    return { ok: false, reason: "Automation paused" };
  }
  if (!settings.suggestionAutoApprove) {
    return { ok: false, reason: "Suggestion auto-approve is OFF" };
  }

  const autoType = mapSuggestionTypeToAutoType(input.suggestionType);
  if (!autoType) {
    return { ok: false, reason: "Suggestion type is not auto-approvable" };
  }

  if (SEO_INTEL_DANGEROUS_AUTO_TYPES.includes(autoType)) {
    if (!settings.dangerousActionSettings[autoType]) {
      return {
        ok: false,
        reason: `Dangerous action "${autoType}" requires manual approval`,
      };
    }
  }

  if (!settings.allowedAutoApproveTypes.includes(autoType)) {
    return { ok: false, reason: `Type "${autoType}" not in allowed auto-approve list` };
  }

  if (input.confidence < settings.minConfidence) {
    return {
      ok: false,
      reason: `Confidence ${input.confidence} below minimum ${settings.minConfidence}`,
    };
  }

  if (RISK_RANK[input.risk] > RISK_RANK[settings.maxRisk]) {
    return {
      ok: false,
      reason: `Risk ${input.risk} exceeds max ${settings.maxRisk}`,
    };
  }

  if (
    input.impressions != null &&
    input.impressions < settings.minGscImpressions
  ) {
    return {
      ok: false,
      reason: `Impressions below minimum ${settings.minGscImpressions}`,
    };
  }

  if (
    input.businessRelevance != null &&
    input.businessRelevance < settings.minBusinessRelevance
  ) {
    return {
      ok: false,
      reason: `Business relevance below ${settings.minBusinessRelevance}`,
    };
  }

  if (input.changesAppliedToday >= settings.dailyChangeLimit) {
    return {
      ok: false,
      reason: `Daily change limit ${settings.dailyChangeLimit} reached`,
    };
  }

  return { ok: true, reason: "Passes auto-approve safety rules" };
}
