import { getAdminDb } from "@/lib/firebase-admin";
import {
  DEFAULT_PRICING_SETTINGS,
  type PricingSettings,
  type PricingRoundingRule,
} from "@/lib/pricing-agent/types";

const DOC = "pricingAgent/settings";

function asRounding(v: unknown): PricingRoundingRule {
  const s = String(v ?? "");
  if (
    s === "nearest_1" ||
    s === "nearest_10" ||
    s === "nearest_50" ||
    s === "nearest_99" ||
    s === "marketing_99"
  ) {
    return s;
  }
  return DEFAULT_PRICING_SETTINGS.defaultRoundingRule;
}

export function parsePricingSettings(
  data: Record<string, unknown> | undefined,
): PricingSettings {
  if (!data) return { ...DEFAULT_PRICING_SETTINGS };
  return {
    autoApproveEnabled: data.autoApproveEnabled === true,
    scheduleEnabled: data.scheduleEnabled !== false,
    timezone: "Asia/Kolkata",
    scheduleDay: "tuesday",
    scheduleTimeIst: "06:00",
    minimumSources: Math.max(1, Number(data.minimumSources) || 3),
    minimumConfidence: Math.min(100, Math.max(0, Number(data.minimumConfidence) || 75)),
    maxIncreasePercent: Math.max(0, Number(data.maxIncreasePercent) || 10),
    maxDecreasePercent: Math.max(0, Number(data.maxDecreasePercent) || 10),
    minimumMarginPercent: Math.max(0, Number(data.minimumMarginPercent) || 15),
    defaultRoundingRule: asRounding(data.defaultRoundingRule),
    allowAutomaticIncrease: data.allowAutomaticIncrease !== false,
    allowAutomaticDecrease: data.allowAutomaticDecrease !== false,
    emergencyPause: data.emergencyPause === true,
    weekendMarkupPercent: Math.max(0, Number(data.weekendMarkupPercent) || 0),
    seasonalMarkupPercent: Math.max(0, Number(data.seasonalMarkupPercent) || 0),
    monsoonDiscountPercent: Math.max(0, Number(data.monsoonDiscountPercent) || 0),
    maxSourcesPerTarget: Math.min(15, Math.max(3, Number(data.maxSourcesPerTarget) || 8)),
    monthlyBudgetInr: Math.max(0, Number(data.monthlyBudgetInr) || 2000),
    notifyOnComplete: data.notifyOnComplete !== false,
    lastRunAt: data.lastRunAt != null ? String(data.lastRunAt) : null,
    nextRunAt: data.nextRunAt != null ? String(data.nextRunAt) : null,
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
    updatedBy: data.updatedBy != null ? String(data.updatedBy) : null,
  };
}

export async function getPricingSettings(): Promise<PricingSettings> {
  const db = getAdminDb();
  if (!db) return { ...DEFAULT_PRICING_SETTINGS };
  try {
    const snap = await db.doc(DOC).get();
    return parsePricingSettings(snap.data() as Record<string, unknown> | undefined);
  } catch {
    return { ...DEFAULT_PRICING_SETTINGS };
  }
}

export async function savePricingSettings(
  patch: Partial<PricingSettings>,
  updatedBy?: string,
): Promise<PricingSettings> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const current = await getPricingSettings();
  const next: PricingSettings = {
    ...current,
    ...patch,
    timezone: "Asia/Kolkata",
    scheduleDay: "tuesday",
    scheduleTimeIst: "06:00",
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy ?? current.updatedBy,
  };
  await db.doc(DOC).set(next, { merge: true });
  return next;
}

/** Next Tuesday 06:00 Asia/Kolkata as ISO UTC. */
export function computeNextTuesdayIstRunIso(from = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = fmt.formatToParts(from);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const y = Number(get("year"));
  const m = Number(get("month"));
  const d = Number(get("day"));
  const weekday = get("weekday"); // Tue, Wed, ...
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = dayMap[weekday] ?? from.getUTCDay();
  let add = (2 - dow + 7) % 7;
  if (add === 0) {
    // If already Tuesday, check if before 06:00 IST
    const hourFmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const hm = hourFmt.format(from);
    const [hh, mm] = hm.split(":").map(Number);
    if ((hh ?? 0) * 60 + (mm ?? 0) >= 6 * 60) add = 7;
  }
  const base = Date.UTC(y, m - 1, d + add, 0, 30, 0); // 06:00 IST = 00:30 UTC
  return new Date(base).toISOString();
}
