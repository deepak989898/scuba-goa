import { getAdminDb } from "@/lib/firebase-admin";
import { istYesterdayString } from "@/lib/ai-analytics/ist";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import { runCompetitorAgent } from "@/lib/command-center/agents/competitor";
import { runPricingAgent } from "@/lib/command-center/agents/pricing";
import { runReputationAgent } from "@/lib/command-center/agents/reputation";
import {
  collectAgentSnapshots,
  countPendingApprovals,
} from "@/lib/command-center/collect-snapshots";
import { resolveConflicts } from "@/lib/command-center/conflict";
import { appendMemory, loadAllMemorySummaries } from "@/lib/command-center/memory";
import { runMasterCoordinator } from "@/lib/command-center/master-ai";
import { sendCommandCenterNotifications } from "@/lib/command-center/notify";
import { getCommandCenterSettings } from "@/lib/command-center/settings";
import { enqueueTasks, syncPendingApprovalTasks } from "@/lib/command-center/task-queue";
import type {
  AgentId,
  AgentStatus,
  CommandCenterAgentLog,
  CommandCenterReportDoc,
  CommandCenterRunDoc,
} from "@/lib/command-center/types";

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function logAgentActivity(log: Omit<CommandCenterAgentLog, "logId">): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  const logId = newId("log");
  await db.collection("commandCenterAgentLogs").doc(logId).set(
    stripUndefinedDeep({ logId, ...log }),
  );
}

export async function runCommandCenterPipeline(opts?: {
  dateIst?: string;
  skipNotifications?: boolean;
}): Promise<{ ok: boolean; dateIst: string; error?: string }> {
  const db = getAdminDb();
  if (!db) return { ok: false, dateIst: "", error: "Firebase Admin not configured" };

  const settings = await getCommandCenterSettings();
  if (!settings.enabled) {
    return { ok: true, dateIst: opts?.dateIst ?? istYesterdayString(), error: "Command center disabled" };
  }

  const dateIst = opts?.dateIst?.trim() || istYesterdayString();
  const runId = `cc_${dateIst}_${Date.now()}`;
  const now = new Date().toISOString();

  const agentResults: Record<AgentId, { status: AgentStatus; summary: string }> = {
    seo: { status: "idle", summary: "" },
    analytics: { status: "idle", summary: "" },
    booking: { status: "idle", summary: "" },
    marketing: { status: "idle", summary: "" },
    reputation: { status: "idle", summary: "" },
    competitor: { status: "idle", summary: "" },
    pricing: { status: "idle", summary: "" },
  };

  try {
    const [baseSnapshots, reputation, competitor, pricing, memory, pendingApprovals] =
      await Promise.all([
        collectAgentSnapshots(dateIst),
        runReputationAgent(),
        runCompetitorAgent(),
        runPricingAgent(),
        loadAllMemorySummaries(),
        countPendingApprovals(),
      ]);

    const snapshots = [
      ...baseSnapshots.filter(
        (s) => !["reputation", "competitor", "pricing"].includes(s.agentId),
      ),
      reputation,
      competitor,
      pricing,
    ];

    for (const s of snapshots) {
      agentResults[s.agentId] = { status: s.status, summary: s.summary };
      await logAgentActivity({
        runId,
        dateIst,
        agentId: s.agentId,
        action: "snapshot",
        status: s.status,
        summary: s.summary,
        createdAt: now,
        details: { keys: Object.keys(s.data) },
      });
    }

    let masterOutput = settings.masterAiEnabled
      ? await runMasterCoordinator({
          dateIst,
          snapshots,
          memorySummaries: memory,
          pendingApprovals,
        })
      : null;

    if (masterOutput) {
      masterOutput = resolveConflicts(masterOutput, settings.conflictPrevention);
    } else {
      masterOutput = {
        headline: "Command center snapshot (OpenAI unavailable)",
        summaryMarkdown: snapshots.map((s) => `- **${s.agentId}**: ${s.summary}`).join("\n"),
        summaryPlain: snapshots.map((s) => `${s.agentId}: ${s.summary}`).join(" | ").slice(0, 900),
        topPriorities: ["Review agent dashboards", "Approve pending actions"],
        decisions: [],
        insights: [],
        alerts: [],
        tasks: [],
      };
    }

    let tasksCreated = 0;
    if (settings.autoCreateTasks) {
      const synced = await syncPendingApprovalTasks(dateIst);
      const masterTaskIds = await enqueueTasks(dateIst, masterOutput.tasks);
      tasksCreated = synced + masterTaskIds.length;
    }

    for (const insight of masterOutput.insights) {
      const insightId = newId("ins");
      await db.collection("commandCenterInsights").doc(insightId).set(
        stripUndefinedDeep({
          insightId,
          runId,
          dateIst,
          ...insight,
          createdAt: now,
        }),
      );
    }

    for (const decision of masterOutput.decisions) {
      const decisionId = newId("dec");
      await db.collection("commandCenterDecisions").doc(decisionId).set(
        stripUndefinedDeep({
          decisionId,
          runId,
          dateIst,
          ...decision,
          createdAt: now,
        }),
      );
    }

    for (const alert of masterOutput.alerts) {
      const alertId = newId("alt");
      await db.collection("commandCenterAlerts").doc(alertId).set(
        stripUndefinedDeep({
          alertId,
          runId,
          dateIst,
          ...alert,
          createdAt: now,
        }),
      );
    }

    const analyticsSnap = snapshots.find((s) => s.agentId === "analytics");
    const internal = (analyticsSnap?.data?.internal ?? {}) as Record<string, unknown>;
    const gsc = (analyticsSnap?.data?.gsc ?? {}) as Record<string, unknown>;

    const report: CommandCenterReportDoc = {
      reportId: dateIst,
      dateIst,
      generatedAt: now,
      headline: masterOutput.headline,
      summaryMarkdown: masterOutput.summaryMarkdown,
      summaryPlain: masterOutput.summaryPlain,
      agentStatuses: Object.fromEntries(
        Object.entries(agentResults).map(([k, v]) => [k, v.status]),
      ) as Record<AgentId, AgentStatus>,
      topPriorities: masterOutput.topPriorities,
      revenueSnapshot: {
        bookingsPaid: Number(internal.bookingsPaid ?? 0),
        revenueInr: Number(internal.bookingRevenueInr ?? 0),
        conversionRatePct: Number(internal.bookingConversionRatePct ?? 0),
      },
      seoSnapshot: {
        clicks: Number(gsc.clicks ?? 0),
        impressions: Number(gsc.impressions ?? 0),
        position: Number(gsc.position ?? 0),
        asOfDate: String(gsc.asOfDate ?? dateIst),
        source: String(gsc.source ?? "none"),
        note: String(gsc.note ?? ""),
      },
      pendingApprovals,
      openaiModel: process.env.AI_ANALYTICS_OPENAI_MODEL?.trim() || "gpt-4o-mini",
    };

    await db.collection("commandCenterReports").doc(dateIst).set(stripUndefinedDeep(report));

    const runDoc: CommandCenterRunDoc = {
      runId,
      runAt: now,
      dateIst,
      agentResults,
      tasksCreated,
      insightsShared: masterOutput.insights.length,
      decisionsCount: masterOutput.decisions.length,
      alertsCount: masterOutput.alerts.length,
      summary: masterOutput.headline,
    };
    await db.collection("commandCenterRuns").doc(runId).set(stripUndefinedDeep(runDoc));

    await Promise.all([
      appendMemory("business", { dateIst, summary: masterOutput.headline }),
      appendMemory("decisions", {
        dateIst,
        summary: masterOutput.topPriorities.slice(0, 3).join("; ") || "No priorities",
      }),
      appendMemory("bookings", {
        dateIst,
        summary: `Bookings: ${internal.bookingsPaid ?? 0}, revenue ₹${internal.bookingRevenueInr ?? 0}`,
      }),
      appendMemory("seo", {
        dateIst,
        summary: `GSC clicks ${gsc.clicks ?? 0}, pos ${gsc.position ?? 0}`,
      }),
      appendMemory("campaigns", {
        dateIst,
        summary: agentResults.marketing.summary || "No marketing run",
      }),
      appendMemory("customers", {
        dateIst,
        summary: agentResults.reputation.summary,
      }),
    ]);

    if (!opts?.skipNotifications && settings.notifyTelegram) {
      await sendCommandCenterNotifications(report);
    }

    return { ok: true, dateIst };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.collection("commandCenterRuns").doc(runId).set(
      stripUndefinedDeep({
        runId,
        runAt: now,
        dateIst,
        agentResults,
        tasksCreated: 0,
        insightsShared: 0,
        decisionsCount: 0,
        alertsCount: 0,
        summary: `Error: ${msg}`,
      }),
    );
    return { ok: false, dateIst, error: msg };
  }
}
