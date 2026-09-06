import { getAdminDb } from "@/lib/firebase-admin";
import { istSlotToUtcIso } from "@/lib/blog-automation/schedule-ist";
import { parseSlotToMinutes } from "@/lib/blog-automation/schedule-utils";
import { dispatchSocialPost } from "@/lib/social-media/dispatch";
import { resolveSocialContentPayload } from "@/lib/social-media/resolve-payload";
import type { SocialAutomationFlags } from "@/lib/social-media/settings";
import { enabledPlatforms } from "@/lib/social-media/settings";
import type { SocialContentType, SocialPlatform } from "@/lib/social-media/types";

const SCHEDULE_DOC = "socialMedia/schedule";

export type SocialScheduleFrequency = "daily" | "weekly" | "monthly";

export type SocialQueueItem = {
  id: string;
  contentType: SocialContentType;
  refId: string;
  title: string;
  order: number;
  addedAt: string;
  lastPostedAt?: string;
  postCount: number;
};

export type SocialScheduleSettings = {
  enabled: boolean;
  frequency: SocialScheduleFrequency;
  /** HH:mm IST */
  timeIst: string;
  /** 0=Sun … 6=Sat (weekly) */
  dayOfWeek: number;
  /** 1–28 (monthly) */
  dayOfMonth: number;
  platforms: SocialAutomationFlags;
  queue: SocialQueueItem[];
  /** Round-robin index into sorted queue */
  cursor: number;
  lastRunAt: string | null;
  lastRunSummary: string | null;
  nextRunAt: string | null;
  updatedAt: string;
};

export const DEFAULT_SOCIAL_SCHEDULE: SocialScheduleSettings = {
  enabled: false,
  frequency: "daily",
  timeIst: "10:00",
  dayOfWeek: 1,
  dayOfMonth: 1,
  platforms: {
    googleBusiness: true,
    facebook: true,
    instagram: true,
    youtube: false,
  },
  queue: [],
  cursor: 0,
  lastRunAt: null,
  lastRunSummary: null,
  nextRunAt: null,
  updatedAt: new Date().toISOString(),
};

function istDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    dateIst: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    dayOfMonth: Number(get("day")),
    dayOfWeek: weekdayMap[weekday] ?? 0,
  };
}

function sortedQueue(queue: SocialQueueItem[]): SocialQueueItem[] {
  return [...queue].sort((a, b) => a.order - b.order || a.addedAt.localeCompare(b.addedAt));
}

export function parseSocialScheduleSettings(
  data: Record<string, unknown> | undefined,
): SocialScheduleSettings {
  if (!data) return { ...DEFAULT_SOCIAL_SCHEDULE };
  const platforms = (data.platforms ?? {}) as Record<string, unknown>;
  const queueRaw = Array.isArray(data.queue) ? data.queue : [];
  const queue = queueRaw
    .map((item, i) => {
      const o = item as Record<string, unknown>;
      const contentTypeRaw = String(o.contentType ?? "");
      if (!["blog", "guide", "video", "reel"].includes(contentTypeRaw)) return null;
      const contentType = contentTypeRaw as SocialContentType;
      const refId = String(o.refId ?? "").trim();
      if (!refId) return null;
      const row: SocialQueueItem = {
        id: String(o.id ?? `q_${i}`),
        contentType,
        refId,
        title: String(o.title ?? refId).slice(0, 200),
        order: Number(o.order ?? i),
        addedAt: String(o.addedAt ?? new Date().toISOString()),
        lastPostedAt: o.lastPostedAt ? String(o.lastPostedAt) : undefined,
        postCount: Math.max(0, Number(o.postCount ?? 0)),
      };
      return row;
    })
    .filter((x): x is SocialQueueItem => x !== null);

  const timeIst = String(data.timeIst ?? "10:00").trim();
  const freq = String(data.frequency ?? "daily");
  const frequency: SocialScheduleFrequency =
    freq === "weekly" || freq === "monthly" ? freq : "daily";

  return {
    enabled: data.enabled === true,
    frequency,
    timeIst: parseSlotToMinutes(timeIst) != null ? timeIst : "10:00",
    dayOfWeek: Math.min(6, Math.max(0, Number(data.dayOfWeek ?? 1))),
    dayOfMonth: Math.min(28, Math.max(1, Number(data.dayOfMonth ?? 1))),
    platforms: {
      googleBusiness: platforms.googleBusiness === true,
      facebook: platforms.facebook === true,
      instagram: platforms.instagram === true,
      youtube: platforms.youtube === true,
    },
    queue,
    cursor: Math.max(0, Number(data.cursor ?? 0)),
    lastRunAt: data.lastRunAt ? String(data.lastRunAt) : null,
    lastRunSummary: data.lastRunSummary ? String(data.lastRunSummary) : null,
    nextRunAt: data.nextRunAt ? String(data.nextRunAt) : null,
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

export async function getSocialScheduleSettings(): Promise<SocialScheduleSettings> {
  const db = getAdminDb();
  if (!db) return { ...DEFAULT_SOCIAL_SCHEDULE };
  const snap = await db.doc(SCHEDULE_DOC).get();
  if (!snap.exists) return { ...DEFAULT_SOCIAL_SCHEDULE };
  return parseSocialScheduleSettings(snap.data() as Record<string, unknown>);
}

export async function saveSocialScheduleSettings(
  patch: Partial<SocialScheduleSettings>,
): Promise<SocialScheduleSettings> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const current = await getSocialScheduleSettings();
  const next: SocialScheduleSettings = {
    ...current,
    ...patch,
    platforms: {
      ...current.platforms,
      ...(patch.platforms ?? {}),
    },
    queue: patch.queue ?? current.queue,
    updatedAt: new Date().toISOString(),
  };
  next.nextRunAt = computeNextRunAt(next);
  await db.doc(SCHEDULE_DOC).set(next, { merge: true });
  return next;
}

export function computeNextRunAt(
  schedule: Pick<
    SocialScheduleSettings,
    "enabled" | "frequency" | "timeIst" | "dayOfWeek" | "dayOfMonth"
  >,
  from = new Date(),
): string | null {
  if (!schedule.enabled) return null;
  const slotMins = parseSlotToMinutes(schedule.timeIst);
  if (slotMins == null) return null;

  const ist = istDateParts(from);
  let candidateDate = ist.dateIst;

  const trySlot = (dateIst: string) => istSlotToUtcIso(dateIst, schedule.timeIst);

  if (schedule.frequency === "daily") {
    let nextIso = trySlot(candidateDate);
    if (new Date(nextIso).getTime() <= from.getTime()) {
      const d = new Date(`${candidateDate}T12:00:00+05:30`);
      d.setDate(d.getDate() + 1);
      candidateDate = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      nextIso = trySlot(candidateDate);
    }
    return nextIso;
  }

  if (schedule.frequency === "weekly") {
    for (let i = 0; i < 14; i++) {
      const d = new Date(`${ist.dateIst}T12:00:00+05:30`);
      d.setDate(d.getDate() + i);
      const dateIst = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const parts = istDateParts(d);
      if (parts.dayOfWeek !== schedule.dayOfWeek) continue;
      const iso = trySlot(dateIst);
      if (new Date(iso).getTime() > from.getTime()) return iso;
    }
    return null;
  }

  for (let i = 0; i < 62; i++) {
    const d = new Date(`${ist.dateIst}T12:00:00+05:30`);
    d.setDate(d.getDate() + i);
    const dateIst = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const parts = istDateParts(d);
    if (parts.dayOfMonth !== schedule.dayOfMonth) continue;
    const iso = trySlot(dateIst);
    if (new Date(iso).getTime() > from.getTime()) return iso;
  }
  return null;
}

function periodKeyForSchedule(
  schedule: Pick<SocialScheduleSettings, "frequency">,
  ist: ReturnType<typeof istDateParts>,
): string {
  if (schedule.frequency === "daily") return ist.dateIst;
  if (schedule.frequency === "weekly") {
    const d = new Date(`${ist.dateIst}T12:00:00+05:30`);
    const diff = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - diff);
    return `week-${d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })}`;
  }
  return ist.dateIst.slice(0, 7);
}

function isScheduleDue(
  schedule: SocialScheduleSettings,
  now = new Date(),
): boolean {
  if (!schedule.enabled || schedule.queue.length === 0) return false;

  const ist = istDateParts(now);
  const slotMins = parseSlotToMinutes(schedule.timeIst);
  if (slotMins == null) return false;
  const nowMins = ist.hour * 60 + ist.minute;
  if (nowMins < slotMins) return false;

  if (schedule.frequency === "weekly" && ist.dayOfWeek !== schedule.dayOfWeek) {
    return false;
  }
  if (schedule.frequency === "monthly" && ist.dayOfMonth !== schedule.dayOfMonth) {
    return false;
  }

  const currentPeriod = periodKeyForSchedule(schedule, ist);
  if (!schedule.lastRunAt) return true;
  const lastIst = istDateParts(new Date(schedule.lastRunAt));
  const lastPeriod = periodKeyForSchedule(schedule, lastIst);
  return currentPeriod !== lastPeriod;
}

export type SocialScheduleRunResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  item?: SocialQueueItem;
  platforms?: SocialPlatform[];
  summary?: string;
};

export async function runSocialScheduleOnce(
  options?: { force?: boolean },
): Promise<SocialScheduleRunResult> {
  const schedule = await getSocialScheduleSettings();
  const platforms = enabledPlatforms(schedule.platforms);

  if (!options?.force) {
    if (!isScheduleDue(schedule)) {
      return { ok: true, skipped: true, summary: "Not due yet" };
    }
  }

  if (!schedule.enabled && !options?.force) {
    return { ok: true, skipped: true, summary: "Schedule disabled" };
  }

  if (!platforms.length) {
    return { ok: false, error: "No platforms selected for scheduled posts" };
  }

  const queue = sortedQueue(schedule.queue);
  if (!queue.length) {
    return { ok: true, skipped: true, summary: "Queue is empty" };
  }

  const index = schedule.cursor % queue.length;
  const item = queue[index];
  const payload = await resolveSocialContentPayload(item.contentType, item.refId);
  if (!payload) {
    const summary = `Skipped missing content: ${item.title}`;
    await saveSocialScheduleSettings({
      cursor: (index + 1) % queue.length,
      lastRunAt: new Date().toISOString(),
      lastRunSummary: summary,
    });
    return { ok: false, error: summary, item };
  }

  try {
    const log = await dispatchSocialPost(payload, platforms, "auto");
    const posted = log.results.filter((r) => r.posted).map((r) => r.platform);
    const summary = posted.length
      ? `Posted "${item.title}" to ${posted.join(", ")}`
      : `No platform published for "${item.title}"`;

    const updatedQueue = schedule.queue.map((q) =>
      q.id === item.id
        ? {
            ...q,
            lastPostedAt: new Date().toISOString(),
            postCount: q.postCount + 1,
          }
        : q,
    );

    await saveSocialScheduleSettings({
      queue: updatedQueue,
      cursor: (index + 1) % queue.length,
      lastRunAt: new Date().toISOString(),
      lastRunSummary: summary,
    });

    return { ok: true, item, platforms, summary };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Schedule post failed";
    await saveSocialScheduleSettings({
      lastRunAt: new Date().toISOString(),
      lastRunSummary: message,
    });
    return { ok: false, error: message, item };
  }
}
