import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import { SEO_INTEL_COLLECTIONS } from "./collections";
import type { SeoIntelActivityLog } from "./types";

export async function appendSeoIntelLog(input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  actor: string;
  details: string;
  result?: "ok" | "error" | "skipped";
  error?: string | null;
}): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  try {
    const ref = db.collection(SEO_INTEL_COLLECTIONS.activityLogs).doc();
    const row: SeoIntelActivityLog = {
      id: ref.id,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      actor: input.actor,
      details: input.details,
      result: input.result ?? "ok",
      error: input.error ?? null,
      createdAt: new Date().toISOString(),
    };
    await ref.set(stripUndefinedDeep(row));
  } catch {
    // Logging must never break primary flows
  }
}

export async function listSeoIntelLogs(limit = 50): Promise<SeoIntelActivityLog[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection(SEO_INTEL_COLLECTIONS.activityLogs)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeoIntelActivityLog);
  } catch {
    // Fallback without composite index
    try {
      const snap = await db
        .collection(SEO_INTEL_COLLECTIONS.activityLogs)
        .limit(limit)
        .get();
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as SeoIntelActivityLog)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    } catch {
      return [];
    }
  }
}
