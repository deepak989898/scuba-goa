import { getAdminDb } from "@/lib/firebase-admin";
import { defaultDateIst } from "@/lib/business-agent/date";
import type { BusinessAgentReportDoc, BusinessAgentRunDoc } from "@/lib/business-agent/types";
import { decideBusinessActions } from "@/lib/business-agent/decision-engine";
import { applyBusinessAgentAction } from "@/lib/business-agent/action-engine";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import { sendBusinessAgentNotifications } from "@/lib/business-agent/notify";

export async function runBusinessAgentDaily(opts?: {
  dateIst?: string;
  maxActions?: number;
}): Promise<{ ok: boolean; dateIst: string; error?: string }> {
  const db = getAdminDb();
  if (!db) return { ok: false, dateIst: "", error: "Firebase Admin not configured" };

  const dateIst = opts?.dateIst?.trim() || defaultDateIst();
  const runId = `biz_${dateIst}_${Date.now()}`;
  const now = new Date().toISOString();

  const runDoc: BusinessAgentRunDoc = {
    runId,
    runAt: now,
    dateIst,
    inputs: {},
    decisionSummary: "",
  };

  try {
    const [aiSnap, conversionSnap] = await Promise.all([
      db.collection("aiAnalyticsDaily").doc(dateIst).get(),
      db.collection("conversionOptDaily").doc(dateIst).get(),
    ]);

    runDoc.inputs.aiAnalyticsDaily =
      aiSnap.exists ? { dateIst } : undefined;
    runDoc.inputs.conversionOptDaily =
      conversionSnap.exists ? { dateIst } : undefined;

    const ai = aiSnap.exists ? (aiSnap.data() as any) : null;
    const conversion = conversionSnap.exists ? (conversionSnap.data() as any) : null;

    if (!ai?.insights) {
      runDoc.decisionSummary = "No aiAnalyticsDaily.insights found. Skipping actions.";
      await db.collection("businessAgentRuns").doc(runId).set(stripUndefinedDeep(runDoc));
      return { ok: true, dateIst };
    }

    const insights = ai.insights as any;
    const actions = await decideBusinessActions({
      dateIst,
      insights: {
        highTrafficLowConversion: insights.highTrafficLowConversion ?? [],
        recommendations: insights.recommendations ?? [],
      },
      conversionIssues: conversion?.issues ?? null,
      maxActions: opts?.maxActions,
    });

    await db.collection("businessAgentRuns").doc(runId).set(stripUndefinedDeep(runDoc), { merge: true });

    const reportId = dateIst;
    const applied: BusinessAgentReportDoc["appliedActions"] = [];
    const pending: BusinessAgentReportDoc["pendingActions"] = [];
    const failed: BusinessAgentReportDoc["failedActions"] = [];

    for (const action of actions) {
      await db.collection("businessAgentActions").doc(action.actionId).set(stripUndefinedDeep(action));

      if (action.status === "failed") {
        failed.push({ kind: action.kind, error: action.error ?? "Empty patch" });
        await db.collection("businessAgentActions").doc(action.actionId).set({ status: "failed", error: action.error ?? "Empty patch" }, { merge: true });
        continue;
      }

      if (action.risk === "safe" && action.patch && Object.keys(action.patch).length) {
        const res = await applyBusinessAgentAction({ action });
        if (res.ok) {
          await db.collection("businessAgentActions").doc(action.actionId).set(stripUndefinedDeep(res.action), { merge: true });
          applied.push({ kind: res.action.kind, target: res.action.target });
        } else {
          failed.push({ kind: action.kind, error: res.error });
          await db.collection("businessAgentActions").doc(action.actionId).set({ status: "failed", error: res.error }, { merge: true });
        }
      } else {
        // Placeholder for later: approval flows
        await db.collection("businessAgentActions").doc(action.actionId).set({ status: "pending_approval" }, { merge: true });
        pending.push({ kind: action.kind, target: action.target });
      }
    }

    const summaryPlain = `Daily ops run ${dateIst}: applied ${applied.length}, pending ${pending.length}, failed ${failed.length}.`;
    const report: BusinessAgentReportDoc = {
      reportId,
      dateIst,
      generatedAt: new Date().toISOString(),
      headline: `Daily ops report ${dateIst}`,
      summaryPlain,
      appliedActions: applied,
      pendingActions: pending,
      failedActions: failed,
    };

    await db.collection("businessAgentReports").doc(reportId).set(stripUndefinedDeep(report), { merge: true });

    await sendBusinessAgentNotifications(report);

    runDoc.decisionSummary = summaryPlain;
    await db.collection("businessAgentRuns").doc(runId).set(stripUndefinedDeep(runDoc), { merge: true });

    return { ok: true, dateIst };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const errorReport: BusinessAgentReportDoc = {
      reportId: dateIst,
      dateIst,
      generatedAt: new Date().toISOString(),
      headline: `Daily ops report ${dateIst} (failed)`,
      summaryPlain: msg.slice(0, 2200),
      appliedActions: [],
      pendingActions: [],
      failedActions: [{ kind: "pipeline", error: msg }],
    };
    await db.collection("businessAgentReports").doc(dateIst).set(stripUndefinedDeep(errorReport), { merge: true });
    await db.collection("businessAgentRuns").doc(runId).set(stripUndefinedDeep({ ...runDoc, decisionSummary: msg }), { merge: true });
    return { ok: false, dateIst, error: msg };
  }
}

