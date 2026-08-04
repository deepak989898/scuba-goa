import { getAdminDb } from "@/lib/firebase-admin";
import type { BlogAutomationSettings } from "@/lib/blog-automation/settings";
import {
  normalizePublishSlotsIst,
} from "@/lib/blog-automation/schedule-utils";

const DOC_PATH = "blogAutomation/dailySchedule";

export type BlogDayOverride = {
  postsPerDay: number;
  publishSlotsIst: string[];
};

/** Next N calendar dates in Asia/Kolkata (YYYY-MM-DD). */
export function listIstDatesFromToday(count: number): string[] {
  const out: string[] = [];
  const base = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base.getTime() + i * 86400000);
    const s = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    out.push(s);
  }
  return out;
}

export async function getBlogDailyScheduleOverrides(): Promise<
  Record<string, BlogDayOverride>
> {
  const db = getAdminDb();
  if (!db) return {};
  try {
    const snap = await db.doc(DOC_PATH).get();
    if (!snap.exists) return {};
    const raw = snap.data()?.days as Record<string, unknown> | undefined;
    if (!raw || typeof raw !== "object") return {};
    const out: Record<string, BlogDayOverride> = {};
    for (const [date, v] of Object.entries(raw)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!v || typeof v !== "object") continue;
      const o = v as Record<string, unknown>;
      const postsPerDay = Math.min(5, Math.max(1, Number(o.postsPerDay) || 1));
      const slots = normalizePublishSlotsIst(
        postsPerDay,
        o.publishSlotsIst ?? o.slots,
      );
      out[date] = { postsPerDay, publishSlotsIst: slots };
    }
    return out;
  } catch (e) {
    console.error("[daily-schedule overrides]", e);
    return {};
  }
}

export async function saveBlogDailyScheduleOverrides(
  days: Record<string, BlogDayOverride>,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const cleaned: Record<string, BlogDayOverride> = {};
  for (const [date, v] of Object.entries(days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const postsPerDay = Math.min(5, Math.max(1, Number(v.postsPerDay) || 1));
    const publishSlotsIst = normalizePublishSlotsIst(
      postsPerDay,
      v.publishSlotsIst,
    );
    cleaned[date] = { postsPerDay, publishSlotsIst };
  }
  await db.doc(DOC_PATH).set(
    { days: cleaned, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}

export function getEffectiveDayPlan(
  dateIst: string,
  overrides: Record<string, BlogDayOverride>,
  defaults: BlogAutomationSettings,
): BlogDayOverride {
  const o = overrides[dateIst];
  if (o) {
    const postsPerDay = Math.min(5, Math.max(1, o.postsPerDay));
    return {
      postsPerDay,
      publishSlotsIst: normalizePublishSlotsIst(postsPerDay, o.publishSlotsIst),
    };
  }
  const postsPerDay = Math.min(5, Math.max(1, defaults.postsPerDay));
  return {
    postsPerDay,
    publishSlotsIst: normalizePublishSlotsIst(
      postsPerDay,
      defaults.publishSlotsIst,
    ),
  };
}

export async function getEffectiveDayPlanForDate(
  dateIst: string,
  defaults: BlogAutomationSettings,
): Promise<BlogDayOverride> {
  const map = await getBlogDailyScheduleOverrides();
  return getEffectiveDayPlan(dateIst, map, defaults);
}
