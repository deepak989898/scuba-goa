import { getAdminDb } from "@/lib/firebase-admin";
import { istSlotToUtcIso } from "@/lib/blog-automation/schedule-ist";
import {
  getIstNow,
  getNextDueSlot,
  getNextUpcomingSlot,
  normalizePublishSlotsIst,
  parseSlotToMinutes,
} from "@/lib/blog-automation/schedule-utils";
import { dispatchSocialPost } from "@/lib/social-media/dispatch";
import { resolveSocialContentPayload } from "@/lib/social-media/resolve-payload";
import type { SocialAutomationFlags } from "@/lib/social-media/settings";
import { enabledPlatforms } from "@/lib/social-media/settings";
import type { SocialContentType, SocialPlatform } from "@/lib/social-media/types";

const SCHEDULE_DOC = "socialMedia/schedule";
export const MAX_SOCIAL_POSTS_PER_DAY = 4;

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

export type SocialDailyRunState = {
  dateIst: string;
  completedSlots: string[];
};

export type SocialScheduleSettings = {
  enabled: boolean;
  frequency: SocialScheduleFrequency;
  /** Posts per day (1–4), each at its own IST time slot. */
  postsPerDay: number;
  /** HH:mm IST — one per postsPerDay, sorted ascending. */
  timeSlotsIst: string[];
  /** @deprecated Use timeSlotsIst — kept for migration */
  timeIst: string;
  /** 0=Sun … 6=Sat (weekly) */
  dayOfWeek: number;
  /** 1–28 (monthly) */
  dayOfMonth: number;
  platforms: SocialAutomationFlags;
  queue: SocialQueueItem[];
  cursor: number;
  dailyRunState: SocialDailyRunState;
  lastRunAt: string | null;
  lastRunSummary: string | null;
  nextRunAt: string | null;
  updatedAt: string;
};

export const DEFAULT_SOCIAL_SCHEDULE: SocialScheduleSettings = {
  enabled: false,
  frequency: "daily",
  postsPerDay: 1,
  timeSlotsIst: ["10:00"],
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
  dailyRunState: { dateIst: "", completedSlots: [] },
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

export function normalizePostsPerDay(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_SOCIAL_POSTS_PER_DAY, Math.max(1, Math.round(n)));
}

export function normalizeSocialTimeSlots(
  postsPerDay: number,
  raw?: unknown,
  legacyTimeIst?: string,
): string[] {
  const count = normalizePostsPerDay(postsPerDay);
  const legacyMins = legacyTimeIst ? parseSlotToMinutes(legacyTimeIst) : null;
  const legacyHour = legacyMins != null ? Math.floor(legacyMins / 60) : undefined;
  return normalizePublishSlotsIst(count, raw, legacyHour).slice(0, MAX_SOCIAL_POSTS_PER_DAY);
}

function sortedQueue(queue: SocialQueueItem[]): SocialQueueItem[] {
  return [...queue].sort((a, b) => a.order - b.order || a.addedAt.localeCompare(b.addedAt));
}

function normalizeDailyRunState(
  raw: unknown,
  dateIst: string,
): SocialDailyRunState {
  const o = raw as Record<string, unknown> | undefined;
  if (!o || String(o.dateIst ?? "") !== dateIst) {
    return { dateIst, completedSlots: [] };
  }
  const completed = Array.isArray(o.completedSlots)
    ? o.completedSlots.map((s) => String(s).trim()).filter((s) => parseSlotToMinutes(s) != null)
    : [];
  return { dateIst, completedSlots: completed };
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
  const postsPerDay = normalizePostsPerDay(data.postsPerDay ?? 1);
  const timeSlotsIst = normalizeSocialTimeSlots(
    postsPerDay,
    data.timeSlotsIst,
    timeIst,
  );
  const freq = String(data.frequency ?? "daily");
  const frequency: SocialScheduleFrequency =
    freq === "weekly" || freq === "monthly" ? freq : "daily";
  const ist = getIstNow();

  return {
    enabled: data.enabled === true,
    frequency,
    postsPerDay,
    timeSlotsIst,
    timeIst: timeSlotsIst[0] ?? (parseSlotToMinutes(timeIst) != null ? timeIst : "10:00"),
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
    dailyRunState: normalizeDailyRunState(data.dailyRunState, ist.date),
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
  const postsPerDay = normalizePostsPerDay(patch.postsPerDay ?? current.postsPerDay);
  const timeSlotsIst = normalizeSocialTimeSlots(
    postsPerDay,
    patch.timeSlotsIst ?? current.timeSlotsIst,
    patch.timeIst ?? current.timeIst,
  );

  const next: SocialScheduleSettings = {
    ...current,
    ...patch,
    postsPerDay,
    timeSlotsIst,
    timeIst: timeSlotsIst[0] ?? current.timeIst,
    platforms: {
      ...current.platforms,
      ...(patch.platforms ?? {}),
    },
    queue: patch.queue ?? current.queue,
    dailyRunState: patch.dailyRunState ?? current.dailyRunState,
    updatedAt: new Date().toISOString(),
  };
  next.nextRunAt = computeNextRunAt(next);
  await db.doc(SCHEDULE_DOC).set(next, { merge: true });
  return next;
}

function isPostingDay(
  schedule: Pick<SocialScheduleSettings, "frequency" | "dayOfWeek" | "dayOfMonth">,
  ist: ReturnType<typeof istDateParts>,
): boolean {
  if (schedule.frequency === "weekly") return ist.dayOfWeek === schedule.dayOfWeek;
  if (schedule.frequency === "monthly") return ist.dayOfMonth === schedule.dayOfMonth;
  return true;
}

export function computeNextRunAt(
  schedule: Pick<
    SocialScheduleSettings,
    | "enabled"
    | "frequency"
    | "timeSlotsIst"
    | "postsPerDay"
    | "dayOfWeek"
    | "dayOfMonth"
    | "dailyRunState"
  >,
  from = new Date(),
): string | null {
  if (!schedule.enabled) return null;
  const slots = normalizeSocialTimeSlots(
    schedule.postsPerDay,
    schedule.timeSlotsIst,
  );
  if (!slots.length) return null;

  const istNow = getIstNow();
  const runState = normalizeDailyRunState(schedule.dailyRunState, istNow.date);

  for (let dayOffset = 0; dayOffset <= 62; dayOffset += 1) {
    const d = new Date(`${istNow.date}T12:00:00+05:30`);
    d.setDate(d.getDate() + dayOffset);
    const dateIst = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (!isPostingDay(schedule, istDateParts(d))) continue;

    const completed = dayOffset === 0 ? runState.completedSlots : [];
    const nextSlot =
      dayOffset === 0
        ? getNextUpcomingSlot(slots, istNow, completed)
        : slots.find((s) => parseSlotToMinutes(s) != null) ?? null;

    if (nextSlot) return istSlotToUtcIso(dateIst, nextSlot);
  }
  return null;
}

export function getScheduleDueSlot(
  schedule: SocialScheduleSettings,
  now = new Date(),
): string | null {
  if (!schedule.enabled || schedule.queue.length === 0) return null;

  const ist = istDateParts(now);
  if (!isPostingDay(schedule, ist)) return null;

  const istNow = getIstNow();
  const slots = normalizeSocialTimeSlots(schedule.postsPerDay, schedule.timeSlotsIst);
  const runState = normalizeDailyRunState(schedule.dailyRunState, istNow.date);

  if (runState.completedSlots.length >= slots.length) return null;

  return getNextDueSlot(slots, istNow, runState.completedSlots);
}

export type SocialScheduleRunResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  item?: SocialQueueItem;
  platforms?: SocialPlatform[];
  summary?: string;
  slot?: string;
};

export async function runSocialScheduleOnce(
  options?: { force?: boolean },
): Promise<SocialScheduleRunResult> {
  const schedule = await getSocialScheduleSettings();
  const platforms = enabledPlatforms(schedule.platforms);
  const dueSlot = options?.force ? null : getScheduleDueSlot(schedule);

  if (!options?.force && !dueSlot) {
    return { ok: true, skipped: true, summary: "Not due yet" };
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
    const slotLabel = dueSlot ? ` @ ${dueSlot} IST` : "";
    const summary = posted.length
      ? `Posted "${item.title}" to ${posted.join(", ")}${slotLabel}`
      : `No platform published for "${item.title}"${slotLabel}`;

    const updatedQueue = schedule.queue.map((q) =>
      q.id === item.id
        ? {
            ...q,
            lastPostedAt: new Date().toISOString(),
            postCount: q.postCount + 1,
          }
        : q,
    );

    const istNow = getIstNow();
    const runState = normalizeDailyRunState(schedule.dailyRunState, istNow.date);
    const completedSlots =
      dueSlot && !runState.completedSlots.includes(dueSlot)
        ? [...runState.completedSlots, dueSlot]
        : runState.completedSlots;

    await saveSocialScheduleSettings({
      queue: updatedQueue,
      cursor: (index + 1) % queue.length,
      dailyRunState: { dateIst: istNow.date, completedSlots },
      lastRunAt: new Date().toISOString(),
      lastRunSummary: summary,
    });

    return { ok: true, item, platforms, summary, slot: dueSlot ?? undefined };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Schedule post failed";
    await saveSocialScheduleSettings({
      lastRunAt: new Date().toISOString(),
      lastRunSummary: message,
    });
    return { ok: false, error: message, item };
  }
}

/** Admin status: today's slot progress. */
export function getScheduleSlotStatus(schedule: SocialScheduleSettings): {
  slotsToday: string[];
  completedToday: string[];
  postsPerDay: number;
  nextSlotIst: string | null;
} {
  const istNow = getIstNow();
  const slots = normalizeSocialTimeSlots(schedule.postsPerDay, schedule.timeSlotsIst);
  const runState = normalizeDailyRunState(schedule.dailyRunState, istNow.date);
  const nextSlotIst = getNextUpcomingSlot(slots, istNow, runState.completedSlots);
  return {
    slotsToday: slots,
    completedToday: runState.completedSlots,
    postsPerDay: slots.length,
    nextSlotIst,
  };
}
