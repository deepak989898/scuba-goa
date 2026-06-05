import { getAdminDb } from "@/lib/firebase-admin";
import { detectCompetitorGaps } from "@/lib/seo-agent/competitors";
import type { AgentSnapshot } from "@/lib/command-center/types";

export async function runCompetitorAgent(): Promise<AgentSnapshot> {
  const db = getAdminDb();
  const opportunities: string[] = [];
  const gaps: string[] = [];

  let serperConfigured = false;
  try {
    const gscQueries = await loadGscQueries();
    const serper = await detectCompetitorGaps(gscQueries);
    serperConfigured = serper.configured;
    for (const ex of serper.examples) {
      gaps.push(`${ex.query}: ${ex.competitorDomains.join(", ")}`);
    }
  } catch {
    /* ignore */
  }

  if (db) {
    const mktSnap = await db.collection("marketingCompetitorReports").limit(3).get();
    const latest = [...mktSnap.docs].sort((a, b) => b.id.localeCompare(a.id))[0];
    if (latest) {
      const d = latest.data() as Record<string, unknown>;
      for (const o of (d.opportunities as string[] | undefined) ?? []) opportunities.push(o);
      for (const g of (d.gaps as string[] | undefined) ?? []) gaps.push(g);
    }
  }

  return {
    agentId: "competitor",
    status: "ok",
    summary: `${gaps.length} gaps, ${opportunities.length} opportunities`,
    data: {
      serperConfigured,
      gaps: gaps.slice(0, 15),
      opportunities: opportunities.slice(0, 15),
      trendingStrategies: opportunities.slice(0, 5),
    },
  };
}

async function loadGscQueries(): Promise<
  { query: string; impressions: number; position: number }[]
> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection("aiAnalyticsDaily").limit(7).get();
  const sorted = [...snap.docs].sort((a, b) => b.id.localeCompare(a.id));
  const latest = sorted[0]?.data() as Record<string, unknown> | undefined;
  const gsc = (latest?.searchConsole ?? {}) as {
    topQueries?: { query: string; impressions: number; position?: number }[];
  };
  return (gsc.topQueries ?? []).map((q) => ({
    query: q.query,
    impressions: q.impressions ?? 0,
    position: q.position ?? 10,
  }));
}
