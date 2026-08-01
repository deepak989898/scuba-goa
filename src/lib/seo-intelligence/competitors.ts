import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import { SEO_INTEL_COLLECTIONS } from "./collections";
import {
  competitorDocId,
  inferCompetitorType,
  isExcludedDomain,
  isOwnDomain,
  normaliseDomain,
} from "./domain";
import { appendSeoIntelLog } from "./activity-log";
import type {
  SeoIntelCompetitor,
  SeoIntelCompetitorStatus,
  SeoIntelCompetitorType,
  SeoIntelPriority,
} from "./types";

export type AddCompetitorInput = {
  domain: string;
  displayName?: string;
  type?: SeoIntelCompetitorType;
  categories?: string[];
  notes?: string;
  priority?: SeoIntelPriority;
  source?: SeoIntelCompetitor["source"];
  relevanceScore?: number;
  confidence?: number;
  status?: SeoIntelCompetitorStatus;
  actor?: string;
};

function nowIso() {
  return new Date().toISOString();
}

export function buildCompetitorRecord(
  input: AddCompetitorInput,
):
  | { ok: true; competitor: SeoIntelCompetitor }
  | { ok: false; error: string } {
  const canonical = normaliseDomain(input.domain);
  if (!canonical) {
    return { ok: false, error: "Invalid domain" };
  }
  if (isOwnDomain(canonical)) {
    return { ok: false, error: "Cannot add your own domain as a competitor" };
  }
  if (isExcludedDomain(canonical) && input.source !== "manual") {
    return {
      ok: false,
      error: "Domain is excluded (social/dictionary/unrelated)",
    };
  }

  const type = input.type ?? inferCompetitorType(canonical);
  const t = nowIso();
  const status = input.status ?? "pending_review";
  const competitor: SeoIntelCompetitor = {
    id: competitorDocId(canonical),
    domain: canonical,
    canonicalDomain: canonical,
    displayName: (input.displayName || canonical).trim(),
    type,
    categories: input.categories ?? [],
    source: input.source ?? "manual",
    relevanceScore: input.relevanceScore ?? 50,
    confidence: input.confidence ?? 50,
    status,
    priority: input.priority ?? "medium",
    notes: input.notes?.trim() ?? "",
    paused: false,
    blocked: status === "blocked",
    discoveredAt: t,
    approvedAt: status === "approved" ? t : null,
    lastAnalysedAt: null,
    updatedAt: t,
  };
  return { ok: true, competitor };
}

export async function listCompetitors(opts?: {
  status?: SeoIntelCompetitorStatus;
  includeBlocked?: boolean;
}): Promise<SeoIntelCompetitor[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db.collection(SEO_INTEL_COLLECTIONS.competitors).get();
    let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SeoIntelCompetitor);
    if (opts?.status) {
      rows = rows.filter((r) => r.status === opts.status);
    }
    if (!opts?.includeBlocked) {
      rows = rows.filter((r) => r.status !== "blocked" && !r.blocked);
    }
    rows.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    return rows;
  } catch {
    return [];
  }
}

export async function getCompetitor(
  id: string,
): Promise<SeoIntelCompetitor | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db
    .collection(SEO_INTEL_COLLECTIONS.competitors)
    .doc(id)
    .get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as SeoIntelCompetitor;
}

export async function addCompetitor(
  input: AddCompetitorInput,
): Promise<
  | { ok: true; competitor: SeoIntelCompetitor; created: boolean }
  | { ok: false; error: string }
> {
  const built = buildCompetitorRecord(input);
  if (!built.ok) return built;

  const db = getAdminDb();
  if (!db) return { ok: false, error: "Server database not configured" };

  const existing = await getCompetitor(built.competitor.id);
  if (existing) {
    return { ok: false, error: `Competitor already exists: ${existing.canonicalDomain}` };
  }

  await db
    .collection(SEO_INTEL_COLLECTIONS.competitors)
    .doc(built.competitor.id)
    .set(stripUndefinedDeep(built.competitor));

  await appendSeoIntelLog({
    action: "competitor.add",
    entityType: "competitor",
    entityId: built.competitor.id,
    actor: input.actor ?? "admin",
    details: `Added ${built.competitor.canonicalDomain} (${built.competitor.source})`,
    result: "ok",
  });

  return { ok: true, competitor: built.competitor, created: true };
}

export async function updateCompetitor(
  id: string,
  patch: Partial<SeoIntelCompetitor>,
  actor = "admin",
): Promise<
  | { ok: true; competitor: SeoIntelCompetitor }
  | { ok: false; error: string }
> {
  const db = getAdminDb();
  if (!db) return { ok: false, error: "Server database not configured" };
  const current = await getCompetitor(id);
  if (!current) return { ok: false, error: "Competitor not found" };

  const next: SeoIntelCompetitor = {
    ...current,
    ...patch,
    id: current.id,
    canonicalDomain: current.canonicalDomain,
    domain: current.domain,
    updatedAt: nowIso(),
  };

  if (patch.status === "approved" && !current.approvedAt) {
    next.approvedAt = nowIso();
  }
  if (patch.status === "blocked") {
    next.blocked = true;
    next.paused = true;
  }
  if (patch.status === "paused") {
    next.paused = true;
  }
  if (patch.status === "approved") {
    next.paused = false;
    next.blocked = false;
  }

  await db
    .collection(SEO_INTEL_COLLECTIONS.competitors)
    .doc(id)
    .set(stripUndefinedDeep(next), { merge: true });

  await appendSeoIntelLog({
    action: "competitor.update",
    entityType: "competitor",
    entityId: id,
    actor,
    details: `Updated ${current.canonicalDomain}`,
    result: "ok",
  });

  return { ok: true, competitor: next };
}

export async function deleteCompetitor(
  id: string,
  actor = "admin",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getAdminDb();
  if (!db) return { ok: false, error: "Server database not configured" };
  const current = await getCompetitor(id);
  if (!current) return { ok: false, error: "Competitor not found" };

  await db.collection(SEO_INTEL_COLLECTIONS.competitors).doc(id).delete();
  await appendSeoIntelLog({
    action: "competitor.delete",
    entityType: "competitor",
    entityId: id,
    actor,
    details: `Deleted ${current.canonicalDomain}`,
    result: "ok",
  });
  return { ok: true };
}
