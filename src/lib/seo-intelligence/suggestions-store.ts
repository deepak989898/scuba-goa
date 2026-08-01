import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import { SEO_INTEL_COLLECTIONS } from "./collections";
import type {
  SeoIntelChangeVersion,
  SeoIntelSuggestion,
  SeoIntelSuggestionStatus,
} from "./types";

export async function listSuggestions(opts?: {
  status?: SeoIntelSuggestionStatus | SeoIntelSuggestionStatus[];
  limit?: number;
}): Promise<SeoIntelSuggestion[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db.collection(SEO_INTEL_COLLECTIONS.suggestions).get();
    let rows = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as SeoIntelSuggestion,
    );
    if (opts?.status) {
      const set = new Set(
        Array.isArray(opts.status) ? opts.status : [opts.status],
      );
      rows = rows.filter((r) => set.has(r.status));
    }
    rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    if (opts?.limit) rows = rows.slice(0, opts.limit);
    return rows;
  } catch {
    return [];
  }
}

export async function getSuggestion(
  id: string,
): Promise<SeoIntelSuggestion | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db
    .collection(SEO_INTEL_COLLECTIONS.suggestions)
    .doc(id)
    .get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as SeoIntelSuggestion;
}

export async function saveSuggestion(
  row: SeoIntelSuggestion,
): Promise<SeoIntelSuggestion> {
  const db = getAdminDb();
  const next = { ...row, updatedAt: new Date().toISOString() };
  if (db) {
    await db
      .collection(SEO_INTEL_COLLECTIONS.suggestions)
      .doc(next.id)
      .set(stripUndefinedDeep(next), { merge: true });
  }
  return next;
}

export async function createSuggestion(
  partial: Omit<SeoIntelSuggestion, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
): Promise<SeoIntelSuggestion> {
  const db = getAdminDb();
  const id =
    partial.id ||
    `sug_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const row: SeoIntelSuggestion = {
    ...partial,
    id,
    createdAt: now,
    updatedAt: now,
  };
  if (db) {
    await db
      .collection(SEO_INTEL_COLLECTIONS.suggestions)
      .doc(id)
      .set(stripUndefinedDeep(row));
  }
  return row;
}

/** Find an open suggestion matching keyword+type (any target URL). */
export async function findOpenSuggestion(input: {
  keywordId: string | null;
  type: string;
}): Promise<SeoIntelSuggestion | null> {
  const rows = await listSuggestions({
    status: [
      "pending_approval",
      "approved",
      "auto_approved",
      "edited_by_admin",
      "deferred",
      "applying",
    ],
  });
  return (
    rows.find(
      (r) =>
        r.type === input.type &&
        (r.keywordId || "") === (input.keywordId || ""),
    ) ?? null
  );
}

/** Avoid regenerating an identical pending/rejected suggestion. */
export async function hasSimilarOpenSuggestion(input: {
  keywordId: string | null;
  type: string;
  targetUrl: string;
}): Promise<boolean> {
  const rows = await listSuggestions({
    status: [
      "pending_approval",
      "approved",
      "auto_approved",
      "edited_by_admin",
      "deferred",
      "rejected",
      "applying",
    ],
  });
  const recentRejectCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  return rows.some((r) => {
    if (r.type !== input.type) return false;
    if ((r.keywordId || "") !== (input.keywordId || "")) return false;
    // Same keyword+type is enough for cannibal (target URL may change to primary)
    if (input.type !== "fix_cannibalisation") {
      if ((r.targetUrl || "") !== (input.targetUrl || "")) return false;
    }
    if (r.status === "rejected") {
      const t = Date.parse(r.updatedAt || r.createdAt || "");
      return Number.isFinite(t) && t >= recentRejectCutoff;
    }
    return [
      "pending_approval",
      "approved",
      "auto_approved",
      "edited_by_admin",
      "deferred",
      "applying",
    ].includes(r.status);
  });
}

export async function saveChangeVersion(
  row: SeoIntelChangeVersion,
): Promise<SeoIntelChangeVersion> {
  const db = getAdminDb();
  if (db) {
    await db
      .collection(SEO_INTEL_COLLECTIONS.changeVersions)
      .doc(row.id)
      .set(stripUndefinedDeep(row));
  }
  return row;
}

export async function getChangeVersion(
  id: string,
): Promise<SeoIntelChangeVersion | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db
    .collection(SEO_INTEL_COLLECTIONS.changeVersions)
    .doc(id)
    .get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as SeoIntelChangeVersion;
}

export async function listChangeVersions(
  limit = 50,
): Promise<SeoIntelChangeVersion[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection(SEO_INTEL_COLLECTIONS.changeVersions)
      .limit(limit)
      .get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as SeoIntelChangeVersion)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  } catch {
    return [];
  }
}

export async function countAppliedToday(): Promise<number> {
  const rows = await listSuggestions({ status: "applied" });
  const day = new Date().toISOString().slice(0, 10);
  return rows.filter((r) => (r.appliedAt || "").startsWith(day)).length;
}
