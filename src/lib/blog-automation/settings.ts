import { getAdminDb } from "@/lib/firebase-admin";
import type { BlogLanguage } from "@/lib/blog-firestore";
import {
  defaultSlotsForCount,
  normalizePublishSlotsIst,
} from "@/lib/blog-automation/schedule-utils";

const SETTINGS_DOC = "blogAutomation/settings";

export type BlogAutomationSettings = {
  enabled: boolean;
  postsPerDay: number;
  /** One IST time per daily post, e.g. ["09:00", "17:30"] */
  publishSlotsIst: string[];
  defaultLanguage: BlogLanguage;
  languageRotation: BlogLanguage[];
  autoTopicIndex: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunError: string | null;
  updatedAt: string;
};

export const DEFAULT_BLOG_AUTOMATION_SETTINGS: BlogAutomationSettings = {
  enabled: false,
  postsPerDay: 1,
  publishSlotsIst: defaultSlotsForCount(1),
  defaultLanguage: "hinglish",
  languageRotation: ["hinglish", "en", "hi"],
  autoTopicIndex: 0,
  lastRunAt: null,
  lastRunStatus: null,
  lastRunError: null,
  updatedAt: new Date().toISOString(),
};

function parseLanguage(raw: unknown): BlogLanguage | null {
  const s = String(raw ?? "").trim();
  if (s === "en" || s === "hi" || s === "hinglish") return s;
  return null;
}

export function parseBlogAutomationSettings(
  data: Record<string, unknown> | undefined,
): BlogAutomationSettings {
  if (!data) return { ...DEFAULT_BLOG_AUTOMATION_SETTINGS };
  const rotRaw = data.languageRotation;
  const rotation: BlogLanguage[] = [];
  if (Array.isArray(rotRaw)) {
    for (const item of rotRaw) {
      const l = parseLanguage(item);
      if (l && !rotation.includes(l)) rotation.push(l);
    }
  }
  const defaultLang =
    parseLanguage(data.defaultLanguage) ??
    DEFAULT_BLOG_AUTOMATION_SETTINGS.defaultLanguage;

  const postsPerDay = Math.min(
    5,
    Math.max(1, Number(data.postsPerDay) || 1),
  );
  const legacyHour =
    data.publishHourIst != null ? Number(data.publishHourIst) : undefined;
  const publishSlotsIst = normalizePublishSlotsIst(
    postsPerDay,
    data.publishSlotsIst ?? data.publishScheduleIst,
    legacyHour,
  );

  return {
    enabled: data.enabled === true,
    postsPerDay,
    publishSlotsIst,
    defaultLanguage: defaultLang,
    languageRotation:
      rotation.length > 0
        ? rotation
        : DEFAULT_BLOG_AUTOMATION_SETTINGS.languageRotation,
    autoTopicIndex: Math.max(0, Number(data.autoTopicIndex) || 0),
    lastRunAt: data.lastRunAt != null ? String(data.lastRunAt) : null,
    lastRunStatus:
      data.lastRunStatus != null ? String(data.lastRunStatus) : null,
    lastRunError:
      data.lastRunError != null ? String(data.lastRunError) : null,
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

export async function getBlogAutomationSettings(): Promise<BlogAutomationSettings> {
  const db = getAdminDb();
  if (!db) return { ...DEFAULT_BLOG_AUTOMATION_SETTINGS };
  try {
    const ref = await db.doc(SETTINGS_DOC).get();
    if (!ref.exists) return { ...DEFAULT_BLOG_AUTOMATION_SETTINGS };
    return parseBlogAutomationSettings(ref.data() as Record<string, unknown>);
  } catch (e) {
    console.error("[blog-automation settings]", e);
    return { ...DEFAULT_BLOG_AUTOMATION_SETTINGS };
  }
}

export async function saveBlogAutomationSettings(
  patch: Partial<BlogAutomationSettings>,
): Promise<BlogAutomationSettings> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const current = await getBlogAutomationSettings();
  const postsPerDay = Math.min(
    5,
    Math.max(1, patch.postsPerDay ?? current.postsPerDay),
  );
  const publishSlotsIst = normalizePublishSlotsIst(
    postsPerDay,
    patch.publishSlotsIst ?? current.publishSlotsIst,
  );
  const next: BlogAutomationSettings = {
    ...current,
    ...patch,
    postsPerDay,
    publishSlotsIst,
    updatedAt: new Date().toISOString(),
  };
  await db.doc(SETTINGS_DOC).set(next, { merge: true });
  return next;
}

/** Count posts published today (IST date). */
export async function countBlogPostsPublishedTodayIst(): Promise<number> {
  const db = getAdminDb();
  if (!db) return 0;
  const istDate = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const snap = await db
    .collection("blogPosts")
    .where("published", "==", true)
    .where("date", "==", istDate)
    .get();
  return snap.size;
}
