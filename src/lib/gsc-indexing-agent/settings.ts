import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import { GSC_INSPECT_QUEUE_BATCH } from "./constants";
import type { AgentMode, SeoSettings } from "./types";
import { siteId } from "./normalize-url";

const COL = "seoSettings";
const DOC = "settings";

export function defaultSeoSettings(): SeoSettings {  const now = new Date().toISOString();
  const property =
    process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim() ||
    `${(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bookscubagoa.com").replace(/\/$/, "")}/`;
  return {
    id: "settings",
    siteId: siteId(),
    agentMode: "approval_required",
    paused: false,
    propertyUri: property.endsWith("/") ? property : `${property}/`,
    inspectionDailyQuota: 50,
    inspectionsUsedToday: 0,
    inspectionsQuotaDate: now.slice(0, 10),
    sitemapSubmitDebounceMinutes: 360,
    lastSitemapSubmitAt: null,
    lastInventoryAt: null,
    lastAnalyticsSyncAt: null,
    notifyOnCritical: true,
    automationScheduleEnabled: false,
    automationFrequency: "daily",
    automationPositionThreshold: 10,
    automationInspectPerRun: GSC_INSPECT_QUEUE_BATCH,
    automationRankingImproveMax: 5,
    automationStartedAt: null,
    automationStartedBy: null,
    automationLastRunAt: null,
    automationLastRunDate: null,
    automationOpenAiImageQueue: [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function getSeoSettings(): Promise<SeoSettings> {
  const db = getAdminDb();
  const defaults = defaultSeoSettings();
  if (!db) return defaults;
  try {
    const snap = await db.collection(COL).doc(DOC).get();
    if (!snap.exists) return defaults;
    const d = snap.data() as Partial<SeoSettings>;
    return { ...defaults, ...d, id: "settings", siteId: siteId() };
  } catch {
    return defaults;
  }
}

export async function saveSeoSettings(
  patch: Partial<SeoSettings>,
): Promise<SeoSettings> {
  const db = getAdminDb();
  const current = await getSeoSettings();
  const next: SeoSettings = {
    ...current,
    ...patch,
    id: "settings",
    siteId: siteId(),
    updatedAt: new Date().toISOString(),
  };
  if (db) {
    await db.collection(COL).doc(DOC).set(stripUndefinedDeep(next), { merge: true });
  }
  return next;
}

export function isAutoFixAllowed(mode: AgentMode, paused: boolean): boolean {
  if (paused) return false;
  return mode === "safe_auto_fix";
}

export function isMonitorOnly(mode: AgentMode, paused: boolean): boolean {
  return paused || mode === "monitor_only";
}

export { GSC_INSPECT_QUEUE_BATCH } from "./constants";
