import { createHash } from "crypto";
import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import { SEO_INTEL_COLLECTIONS } from "./collections";
import { normaliseKeyword } from "./domain";
import type { SeoIntelKeyword, SeoIntelRankSnapshot } from "./types";

export function keywordDocId(normalised: string): string {
  return createHash("sha256").update(normalised).digest("hex").slice(0, 32);
}

export async function listKeywords(opts?: {
  status?: SeoIntelKeyword["status"];
  limit?: number;
}): Promise<SeoIntelKeyword[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db.collection(SEO_INTEL_COLLECTIONS.keywords).get();
    let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeoIntelKeyword);
    if (opts?.status) rows = rows.filter((r) => r.status === opts.status);
    rows.sort(
      (a, b) =>
        (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0) ||
        (b.impressions ?? 0) - (a.impressions ?? 0),
    );
    if (opts?.limit) rows = rows.slice(0, opts.limit);
    return rows;
  } catch {
    return [];
  }
}

export async function getKeyword(
  id: string,
): Promise<SeoIntelKeyword | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(SEO_INTEL_COLLECTIONS.keywords).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as SeoIntelKeyword;
}

export async function upsertKeyword(
  partial: Omit<SeoIntelKeyword, "id" | "discoveredAt" | "updatedAt"> & {
    id?: string;
    discoveredAt?: string;
  },
): Promise<SeoIntelKeyword> {
  const db = getAdminDb();
  const normalised =
    partial.normalisedKeyword || normaliseKeyword(partial.keyword);
  const id = partial.id || keywordDocId(normalised);
  const now = new Date().toISOString();
  const existing = db ? await getKeyword(id) : null;

  const next: SeoIntelKeyword = {
    id,
    keyword: partial.keyword,
    normalisedKeyword: normalised,
    clusterId: partial.clusterId ?? existing?.clusterId ?? null,
    primaryKeyword: partial.primaryKeyword ?? existing?.primaryKeyword ?? null,
    intent: partial.intent,
    category: partial.category,
    location: partial.location,
    searchVolume: partial.searchVolume ?? existing?.searchVolume ?? null,
    difficulty: partial.difficulty ?? existing?.difficulty ?? null,
    source: partial.source || existing?.source || "mixed",
    priorityScore: partial.priorityScore,
    businessValueScore: partial.businessValueScore,
    existingPageId: partial.existingPageId,
    existingPageUrl: partial.existingPageUrl,
    existingPageType: partial.existingPageType,
    pageMatchStatus: partial.pageMatchStatus,
    pageMatchNote: partial.pageMatchNote,
    recommendedContentType: partial.recommendedContentType,
    status: partial.status ?? existing?.status ?? "active",
    myPosition: partial.myPosition ?? existing?.myPosition ?? null,
    myUrl: partial.myUrl ?? existing?.myUrl ?? null,
    impressions: partial.impressions ?? existing?.impressions ?? null,
    clicks: partial.clicks ?? existing?.clicks ?? null,
    ctr: partial.ctr ?? existing?.ctr ?? null,
    bestCompetitorPosition:
      partial.bestCompetitorPosition ?? existing?.bestCompetitorPosition ?? null,
    bestCompetitorDomain:
      partial.bestCompetitorDomain ?? existing?.bestCompetitorDomain ?? null,
    rankingGap: partial.rankingGap ?? existing?.rankingGap ?? null,
    opportunityScore: partial.opportunityScore,
    recommendedAction: partial.recommendedAction,
    competitorPreview:
      partial.competitorPreview ?? existing?.competitorPreview ?? [],
    discoveredAt: existing?.discoveredAt || partial.discoveredAt || now,
    lastCheckedAt: partial.lastCheckedAt ?? existing?.lastCheckedAt ?? null,
    updatedAt: now,
  };

  if (db) {
    await db
      .collection(SEO_INTEL_COLLECTIONS.keywords)
      .doc(id)
      .set(stripUndefinedDeep(next), { merge: true });
  }
  return next;
}

export async function saveRankSnapshot(
  snapshot: Omit<SeoIntelRankSnapshot, "id"> & { id?: string },
): Promise<SeoIntelRankSnapshot> {
  const db = getAdminDb();
  const id =
    snapshot.id ||
    `${snapshot.keywordId}_${snapshot.checkedAt.slice(0, 10)}_${Date.now()}`;
  const row: SeoIntelRankSnapshot = { ...snapshot, id };
  if (db) {
    await db
      .collection(SEO_INTEL_COLLECTIONS.rankSnapshots)
      .doc(id)
      .set(stripUndefinedDeep(row));
  }
  return row;
}

export async function listRankSnapshots(
  keywordId: string,
  limit = 20,
): Promise<SeoIntelRankSnapshot[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection(SEO_INTEL_COLLECTIONS.rankSnapshots)
      .where("keywordId", "==", keywordId)
      .limit(limit)
      .get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as SeoIntelRankSnapshot)
      .sort((a, b) => (b.checkedAt || "").localeCompare(a.checkedAt || ""));
  } catch {
    return [];
  }
}

export async function findKeywordByText(
  keyword: string,
): Promise<SeoIntelKeyword | null> {
  const id = keywordDocId(normaliseKeyword(keyword));
  return getKeyword(id);
}
