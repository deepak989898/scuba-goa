import { getAdminDb } from "@/lib/firebase-admin";
import {
  DEFAULT_SEO_BLOG_SETTINGS,
  type SeoBlogCenterLog,
  type SeoBlogCenterSettings,
  type SeoBlogDraft,
  type SeoBlogKeyword,
  type SeoBlogMeta,
} from "@/lib/seo-blog-center/types";

const COL = {
  keywords: "seoBlogKeywords",
  meta: "seoBlogMeta",
  drafts: "seoBlogDrafts",
  settings: "seoBlogCenter",
  logs: "seoBlogCenterLogs",
} as const;

export async function getSeoBlogSettings(): Promise<SeoBlogCenterSettings> {
  const db = getAdminDb();
  if (!db) return { ...DEFAULT_SEO_BLOG_SETTINGS };
  const snap = await db.collection(COL.settings).doc("settings").get();
  if (!snap.exists) return { ...DEFAULT_SEO_BLOG_SETTINGS };
  return { ...DEFAULT_SEO_BLOG_SETTINGS, ...(snap.data() as SeoBlogCenterSettings) };
}

export async function updateSeoBlogSettings(
  updates: Partial<SeoBlogCenterSettings>,
): Promise<SeoBlogCenterSettings> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const current = await getSeoBlogSettings();
  const next = {
    ...current,
    ...updates,
    id: "global" as const,
    updatedAt: new Date().toISOString(),
  };
  await db.collection(COL.settings).doc("settings").set(next, { merge: true });
  return next;
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
  await db.collection(COL.logs).doc(log.id).set(log);
}

export async function listKeywords(
  status?: SeoBlogKeyword["status"],
  limit = 200,
): Promise<SeoBlogKeyword[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(COL.keywords)
    .orderBy("createdAt", "desc")
    .limit(Math.min(500, limit * 3))
    .get();
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeoBlogKeyword);
  const filtered = status ? all.filter((k) => k.status === status) : all;
  return filtered.slice(0, limit);
}

export async function listDrafts(
  status?: SeoBlogDraft["status"],
  limit = 100,
): Promise<SeoBlogDraft[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(COL.drafts)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeoBlogDraft);
  return status ? all.filter((d) => d.status === status) : all;
}

export async function listLogs(limit = 50): Promise<SeoBlogCenterLog[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(COL.logs)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeoBlogCenterLog);
}

export async function saveKeyword(kw: SeoBlogKeyword): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db.collection(COL.keywords).doc(kw.id).set(kw, { merge: true });
}

export async function saveMeta(meta: SeoBlogMeta): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db.collection(COL.meta).doc(meta.id).set(meta, { merge: true });
}

export async function saveDraft(draft: SeoBlogDraft): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db.collection(COL.drafts).doc(draft.id).set(draft, { merge: true });
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

export async function getMetaForKeyword(keywordId: string): Promise<SeoBlogMeta | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(COL.meta).doc(`meta_${keywordId}`).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as SeoBlogMeta;
}

export { COL as SEO_BLOG_COLLECTIONS };
