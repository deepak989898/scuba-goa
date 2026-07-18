import { getAdminDb } from "@/lib/firebase-admin";
import type {
  CompetitorPriceSnapshot,
  PackagePriceHistory,
  PackagePricingRules,
  PricingRun,
  PricingSuggestion,
  PricingTargetKind,
} from "@/lib/pricing-agent/types";

const SUGGESTIONS = "pricingSuggestions";
const RUNS = "pricingRuns";
const SNAPSHOTS = "competitorPriceSnapshots";
const HISTORY = "packagePriceHistory";
const RULES = "packagePricingRules";

export async function createPricingRun(
  run: Omit<PricingRun, "id"> & { id?: string },
): Promise<string> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  const id = run.id ?? db.collection(RUNS).doc().id;
  await db.collection(RUNS).doc(id).set({ ...run, id }, { merge: true });
  return id;
}

export async function updatePricingRun(
  id: string,
  patch: Partial<PricingRun>,
): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db.collection(RUNS).doc(id).set(patch, { merge: true });
}

export async function savePricingSuggestion(
  suggestion: PricingSuggestion,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db.collection(SUGGESTIONS).doc(suggestion.id).set(suggestion, { merge: true });
}

export async function saveCompetitorSnapshots(
  snapshots: CompetitorPriceSnapshot[],
): Promise<void> {
  const db = getAdminDb();
  if (!db || !snapshots.length) return;
  const batch = db.batch();
  for (const s of snapshots) {
    batch.set(db.collection(SNAPSHOTS).doc(s.id), s, { merge: true });
  }
  await batch.commit();
}

export async function savePriceHistory(
  entry: PackagePriceHistory,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db.collection(HISTORY).doc(entry.id).set(entry, { merge: true });
}

export async function getSuggestion(
  id: string,
): Promise<PricingSuggestion | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(SUGGESTIONS).doc(id).get();
  if (!snap.exists) return null;
  return snap.data() as PricingSuggestion;
}

export async function listSuggestions(limit = 80): Promise<PricingSuggestion[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(SUGGESTIONS).limit(Math.min(200, limit)).get();
  return snap.docs
    .map((d) => d.data() as PricingSuggestion)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listRuns(limit = 20): Promise<PricingRun[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(RUNS).limit(Math.min(50, limit)).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<PricingRun, "id">) }))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function listHistoryForTarget(
  targetId: string,
  limit = 20,
): Promise<PackagePriceHistory[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(HISTORY)
    .where("targetId", "==", targetId)
    .limit(Math.min(50, limit))
    .get()
    .catch(() => null);
  if (!snap) return [];
  return snap.docs
    .map((d) => d.data() as PackagePriceHistory)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listSnapshotsForSuggestion(
  suggestionId: string,
): Promise<CompetitorPriceSnapshot[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(SNAPSHOTS)
    .where("suggestionId", "==", suggestionId)
    .limit(30)
    .get()
    .catch(() => null);
  if (!snap) return [];
  return snap.docs.map((d) => d.data() as CompetitorPriceSnapshot);
}

export async function getPackagePricingRules(
  targetId: string,
): Promise<PackagePricingRules | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(RULES).doc(targetId).get();
  if (!snap.exists) return null;
  return snap.data() as PackagePricingRules;
}

export async function savePackagePricingRules(
  rules: PackagePricingRules,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin not configured");
  await db.collection(RULES).doc(rules.targetId).set(rules, { merge: true });
}

export function parseTargetId(targetId: string): {
  kind: PricingTargetKind;
  refId: string;
} | null {
  const [kind, ...rest] = targetId.split(":");
  const refId = rest.join(":");
  if ((kind !== "package" && kind !== "service") || !refId) return null;
  return { kind, refId };
}
