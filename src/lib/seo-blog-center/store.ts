import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import {
  DEFAULT_SEO_BLOG_SETTINGS,
  MAX_BLOGS_PER_DAY_LIMIT,
  type AiBlogGenerationJob,
  type SeoBlogCenterLog,
  type SeoBlogCenterSettings,
  type SeoBlogDraft,
  type SeoBlogKeyword,
  type SeoBlogMeta,
  type SeoKeywordCluster,
} from "@/lib/seo-blog-center/types";

const COL = {
  keywords: "seoBlogKeywords",
  meta: "seoBlogMeta",
  drafts: "seoBlogDrafts",
  settings: "seoBlogCenter",
  logs: "seoBlogCenterLogs",
  clusters: "seoBlogClusters",
  jobs: "seoBlogGenerationJobs",
} as const;

async function countCollection(
  collectionName: string,
  field?: string,
  value?: string,
): Promise<number> {
  const db = getAdminDb();
  if (!db) return 0;
  try {
    let q = db.collection(collectionName);
    if (field && value !== undefined) {
      q = q.where(field, "==", value) as typeof q;
    }
    const snap = await q.count().get();
    return snap.data().count;
  } catch (e) {
    console.error(`[seo-blog-center] count ${collectionName} failed`, e);
    return 0;
  }
}

/** Firestore totals for dashboard cards (not capped list samples). */
export async function getSeoBlogDashboardCounts(): Promise<{
  keywords: number;
  pendingKeywords: number;
  pendingClusters: number;
  waitingJobs: number;
  failedJobs: number;
  drafts: number;
  publishedDrafts: number;
}> {
  const [
    keywords,
    pendingKeywords,
    pendingClusters,
    waitingJobs,
    failedJobs,
    publishedDrafts,
    draftTotal,
  ] = await Promise.all([
    countCollection(COL.keywords),
    countCollection(COL.keywords, "status", "pending"),
    countCollection(COL.clusters, "status", "pending"),
    countCollection(COL.jobs, "status", "waiting"),
    countCollection(COL.jobs, "status", "failed"),
    countCollection(COL.drafts, "status", "published"),
    countCollection(COL.drafts),
  ]);
  return {
    keywords,
    pendingKeywords,
    pendingClusters,
    waitingJobs,
    failedJobs,
    drafts: Math.max(0, draftTotal - publishedDrafts),
    publishedDrafts,
  };
}

function todayIst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export async function getSeoBlogSettings(): Promise<SeoBlogCenterSettings> {
  const db = getAdminDb();
  if (!db) return { ...DEFAULT_SEO_BLOG_SETTINGS };
  const snap = await db.collection(COL.settings).doc("settings").get();
  if (!snap.exists) return { ...DEFAULT_SEO_BLOG_SETTINGS };
  return { ...DEFAULT_SEO_BLOG_SETTINGS, ...(snap.data() as SeoBlogCenterSettings) };
}

function clampDailyBlogLimit(n: unknown, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(MAX_BLOGS_PER_DAY_LIMIT, Math.max(1, Math.round(v)));
}

export async function updateSeoBlogSettings(
  updates: Partial<SeoBlogCenterSettings>,
): Promise<SeoBlogCenterSettings> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const current = await getSeoBlogSettings();
  const patch = { ...updates };
  if (patch.maxBlogsGeneratedPerDay != null) {
    patch.maxBlogsGeneratedPerDay = clampDailyBlogLimit(
      patch.maxBlogsGeneratedPerDay,
      current.maxBlogsGeneratedPerDay,
    );
  }
  if (patch.maxBlogsPublishedPerDay != null) {
    patch.maxBlogsPublishedPerDay = clampDailyBlogLimit(
      patch.maxBlogsPublishedPerDay,
      current.maxBlogsPublishedPerDay,
    );
  }
  if (patch.maxImagesPerDay != null) {
    patch.maxImagesPerDay = clampDailyBlogLimit(
      patch.maxImagesPerDay,
      current.maxImagesPerDay,
    );
  }
  if (patch.automationPostsPerDay != null) {
    patch.automationPostsPerDay = clampDailyBlogLimit(
      patch.automationPostsPerDay,
      current.automationPostsPerDay ?? 5,
    );
  }
  const next = {
    ...current,
    ...patch,
    id: "global" as const,
    updatedAt: new Date().toISOString(),
  };
  await db
    .collection(COL.settings)
    .doc("settings")
    .set(stripUndefinedDeep(next), { merge: true });
  return next;
}

/** Reset daily counters when the IST date rolls over. */
export async function bumpDailyCounter(
  field: "researchCalls" | "blogsGenerated" | "imagesGenerated" | "blogsPublished",
  by = 1,
): Promise<SeoBlogCenterSettings> {
  const settings = await getSeoBlogSettings();
  const day = todayIst();
  const map = {
    researchCalls: {
      count: "researchCallsToday",
      date: "researchCallsDate",
    },
    blogsGenerated: {
      count: "blogsGeneratedToday",
      date: "blogsGeneratedDate",
    },
    imagesGenerated: {
      count: "imagesGeneratedToday",
      date: "imagesGeneratedDate",
    },
    blogsPublished: {
      count: "blogsPublishedToday",
      date: "blogsPublishedDate",
    },
  } as const;
  const keys = map[field];
  const prevDate = settings[keys.date as keyof SeoBlogCenterSettings] as
    | string
    | undefined;
  const prevCount =
    (settings[keys.count as keyof SeoBlogCenterSettings] as number | undefined) ?? 0;
  const nextCount = prevDate === day ? prevCount + by : by;
  return updateSeoBlogSettings({
    [keys.count]: nextCount,
    [keys.date]: day,
  } as Partial<SeoBlogCenterSettings>);
}

export async function addSeoBlogLog(
  input: Omit<SeoBlogCenterLog, "id" | "createdAt">,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  const log: SeoBlogCenterLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...input,
    createdAt: new Date().toISOString(),
  };
  await db.collection(COL.logs).doc(log.id).set(stripUndefinedDeep(log));
}

export async function listKeywords(
  status?: SeoBlogKeyword["status"],
  limit = 200,
): Promise<SeoBlogKeyword[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection(COL.keywords)
      .orderBy("createdAt", "desc")
      .limit(Math.min(500, limit * 3))
      .get();
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeoBlogKeyword);
    const filtered = status ? all.filter((k) => k.status === status) : all;
    return filtered.slice(0, limit);
  } catch (e) {
    console.error("[seo-blog-center] listKeywords failed", e);
    const snap = await db.collection(COL.keywords).limit(Math.min(500, limit * 3)).get();
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeoBlogKeyword);
    const filtered = status ? all.filter((k) => k.status === status) : all;
    return filtered
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, limit);
  }
}

export async function listDrafts(
  status?: SeoBlogDraft["status"],
  limit = 100,
): Promise<SeoBlogDraft[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection(COL.drafts)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeoBlogDraft);
    return status ? all.filter((d) => d.status === status) : all;
  } catch (e) {
    console.error("[seo-blog-center] listDrafts failed", e);
    const snap = await db.collection(COL.drafts).limit(limit).get();
    const all = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as SeoBlogDraft)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return status ? all.filter((d) => d.status === status) : all;
  }
}

export async function listLogs(limit = 50): Promise<SeoBlogCenterLog[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection(COL.logs)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeoBlogCenterLog);
  } catch (e) {
    console.error("[seo-blog-center] listLogs failed", e);
    const snap = await db.collection(COL.logs).limit(limit).get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as SeoBlogCenterLog)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, limit);
  }
}

export async function listClusters(limit = 100): Promise<SeoKeywordCluster[]> {
  const db = getAdminDb();
  if (!db) return [];
  const cap = Math.min(500, Math.max(1, limit));

  try {
    const snap = await db
      .collection(COL.clusters)
      .orderBy("createdAt", "desc")
      .limit(cap)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeoKeywordCluster);
  } catch (e) {
    console.error("[seo-blog-center] listClusters orderBy failed", e);
    const snap = await db.collection(COL.clusters).limit(cap * 4).get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as SeoKeywordCluster)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, cap);
  }
}

/** Pending clusters for approve UI — newest first. */
export async function listPendingClusters(limit = 250): Promise<SeoKeywordCluster[]> {
  const cap = Math.min(500, Math.max(1, limit));
  const rows = await listClusters(Math.min(500, cap * 2));
  return rows.filter((c) => c.status === "pending").slice(0, cap);
}

export async function listGenerationJobs(
  status?: AiBlogGenerationJob["status"],
  limit = 100,
): Promise<AiBlogGenerationJob[]> {
  const db = getAdminDb();
  if (!db) return [];
  const cap = Math.min(500, Math.max(1, limit));

  try {
    const snap = await db
      .collection(COL.jobs)
      .orderBy("createdAt", "desc")
      .limit(status ? cap * 2 : cap)
      .get();
    let all = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as AiBlogGenerationJob,
    );
    if (status) all = all.filter((j) => j.status === status);
    return all.slice(0, cap);
  } catch (e) {
    console.error("[seo-blog-center] listGenerationJobs orderBy failed", e);
    const snap = await db.collection(COL.jobs).limit(cap * 4).get();
    let all = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as AiBlogGenerationJob,
    );
    if (status) all = all.filter((j) => j.status === status);
    return all
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, cap);
  }
}

export async function saveKeyword(kw: SeoBlogKeyword): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db
    .collection(COL.keywords)
    .doc(kw.id)
    .set(stripUndefinedDeep(kw), { merge: true });
}

export async function saveMeta(meta: SeoBlogMeta): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db
    .collection(COL.meta)
    .doc(meta.id)
    .set(stripUndefinedDeep(meta), { merge: true });
}

export async function saveDraft(draft: SeoBlogDraft): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db
    .collection(COL.drafts)
    .doc(draft.id)
    .set(stripUndefinedDeep(draft), { merge: true });
}

export async function saveCluster(cluster: SeoKeywordCluster): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db
    .collection(COL.clusters)
    .doc(cluster.id)
    .set(stripUndefinedDeep(cluster), { merge: true });
}

export async function deleteCluster(id: string): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db.collection(COL.clusters).doc(id).delete();
}

export async function deleteKeyword(id: string): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db.collection(COL.keywords).doc(id).delete();
}

export async function saveGenerationJob(job: AiBlogGenerationJob): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db
    .collection(COL.jobs)
    .doc(job.id)
    .set(stripUndefinedDeep(job), { merge: true });
}

export async function deleteGenerationJob(id: string): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db.collection(COL.jobs).doc(id).delete();
}

export async function getKeywordById(id: string): Promise<SeoBlogKeyword | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(COL.keywords).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as SeoBlogKeyword;
}

export async function getDraftById(id: string): Promise<SeoBlogDraft | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(COL.drafts).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as SeoBlogDraft;
}

export async function getClusterById(id: string): Promise<SeoKeywordCluster | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(COL.clusters).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as SeoKeywordCluster;
}

export async function getGenerationJobById(
  id: string,
): Promise<AiBlogGenerationJob | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(COL.jobs).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as AiBlogGenerationJob;
}

export async function getMetaForKeyword(keywordId: string): Promise<SeoBlogMeta | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(COL.meta).doc(`meta_${keywordId}`).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as SeoBlogMeta;
}

export { COL as SEO_BLOG_COLLECTIONS };
