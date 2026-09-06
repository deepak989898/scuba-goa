import type { SocialAutomationFlags } from "@/lib/social-media/settings";
import type { SocialContentType } from "@/lib/social-media/types";

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
