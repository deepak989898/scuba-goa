import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { AGENT_REGISTRY } from "@/lib/command-center/agent-registry";
import { getCommandCenterSettings } from "@/lib/command-center/settings";
import { loadAllMemorySummaries } from "@/lib/command-center/memory";
import { getAdminDb } from "@/lib/firebase-admin";
import { firestoreDocToJson } from "@/lib/firestore-json";
import { countPendingApprovals } from "@/lib/command-center/collect-snapshots";
import { resolveGscForCommandCenter } from "@/lib/command-center/resolve-gsc";

function latest(docs: QueryDocumentSnapshot[], limit: number) {
  return [...docs]
    .sort((a, b) =>
      String(b.data().createdAt ?? b.data().updatedAt ?? b.id).localeCompare(
        String(a.data().createdAt ?? a.data().updatedAt ?? a.id),
      ),
    )
    .slice(0, limit)
    .map((d) => firestoreDocToJson(d.id, d.data()));
}

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Firebase Admin not configured" }, { status: 500 });
  }

  try {
    const url = new URL(req.url);
    const days = Math.min(30, Math.max(1, Number(url.searchParams.get("days") ?? 14)));

    const [
      reportsSnap,
      runsSnap,
      tasksSnap,
      logsSnap,
      insightsSnap,
      decisionsSnap,
      alertsSnap,
      settings,
      memory,
      pendingApprovals,
      liveSeo,
    ] = await Promise.all([
      db.collection("commandCenterReports").get(),
      db.collection("commandCenterRuns").get(),
      db.collection("commandCenterTasks").get(),
      db.collection("commandCenterAgentLogs").get(),
      db.collection("commandCenterInsights").get(),
      db.collection("commandCenterDecisions").get(),
      db.collection("commandCenterAlerts").get(),
      getCommandCenterSettings(),
      loadAllMemorySummaries(),
      countPendingApprovals(),
      resolveGscForCommandCenter(),
    ]);

    const reports = [...reportsSnap.docs]
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, days)
      .map((d) => firestoreDocToJson(d.id, d.data()));

    const latestReport = reports[0] ?? null;
    const tasks = latest(tasksSnap.docs, 30);
    const queuedTasks = tasks.filter((t) => t.status === "queued");

    return NextResponse.json({
      agents: AGENT_REGISTRY,
      settings,
      memory,
      pendingApprovals,
      latestReport,
      /** Fresh GSC resolution — use for metric cards (not stale report zeros). */
      liveSeoSnapshot: {
        clicks: liveSeo.clicks,
        impressions: liveSeo.impressions,
        position: liveSeo.position,
        ctr: liveSeo.ctr,
        asOfDate: liveSeo.asOfDate,
        source: liveSeo.source,
        note: liveSeo.note,
      },
      reports,
      stats: {
        totalRuns: runsSnap.size,
        queuedTasks: queuedTasks.length,
        openAlerts: alertsSnap.docs.filter(
          (d) => (d.data() as { severity?: string }).severity === "critical",
        ).length,
        recentInsights: insightsSnap.size,
        recentDecisions: decisionsSnap.size,
      },
      runs: latest(runsSnap.docs, 10),
      tasks,
      agentLogs: latest(logsSnap.docs, 40),
      insights: latest(insightsSnap.docs, 15),
      decisions: latest(decisionsSnap.docs, 15),
      alerts: latest(alertsSnap.docs, 15),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
