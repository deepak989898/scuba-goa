import { getAdminDb } from "@/lib/firebase-admin";
import { listActivePricingTargets } from "@/lib/pricing-agent/catalog";
import { researchMarketPrices } from "@/lib/pricing-agent/market-research";
import { recommendPriceWithAi } from "@/lib/pricing-agent/openai-recommend";
import { applySafetyRules } from "@/lib/pricing-agent/safety";
import {
  computeNextTuesdayIstRunIso,
  getPricingSettings,
  savePricingSettings,
} from "@/lib/pricing-agent/settings";
import {
  createPricingRun,
  getPackagePricingRules,
  saveCompetitorSnapshots,
  savePricingSuggestion,
  updatePricingRun,
} from "@/lib/pricing-agent/store";
import { applyLiveCatalogPrice } from "@/lib/pricing-agent/apply-price";
import { sendPricingAgentNotifications } from "@/lib/pricing-agent/notify";
import type { PricingRunType, PricingSuggestion } from "@/lib/pricing-agent/types";

const LEASE_DOC = "pricingAgent/runLock";

async function acquireRunLock(leaseId: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  return db.runTransaction(async (tx) => {
    const ref = db.doc(LEASE_DOC);
    const snap = await tx.get(ref);
    const data = snap.data() as { status?: string; startedAt?: string } | undefined;
    const started = Date.parse(data?.startedAt ?? "");
    const stillRunning =
      data?.status === "running" &&
      Number.isFinite(started) &&
      Date.now() - started < 25 * 60 * 1000;
    if (stillRunning) return false;
    tx.set(
      ref,
      { status: "running", leaseId, startedAt: new Date().toISOString() },
      { merge: true },
    );
    return true;
  });
}

async function releaseRunLock(leaseId: string, status: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db.doc(LEASE_DOC).set(
    {
      status,
      leaseId,
      completedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function runPricingAgentPipeline(opts?: {
  runType?: PricingRunType;
  dryRun?: boolean;
  triggeredBy?: string;
  targetIds?: string[];
}): Promise<{
  ok: boolean;
  runId: string;
  error?: string;
  suggestionsCreated: number;
  pricesUpdated: number;
}> {
  const db = getAdminDb();
  if (!db) {
    return {
      ok: false,
      runId: "",
      error: "Firebase Admin not configured",
      suggestionsCreated: 0,
      pricesUpdated: 0,
    };
  }

  const leaseId = crypto.randomUUID();
  const locked = await acquireRunLock(leaseId);
  if (!locked) {
    return {
      ok: false,
      runId: "",
      error: "Another pricing run is already in progress",
      suggestionsCreated: 0,
      pricesUpdated: 0,
    };
  }

  const settings = await getPricingSettings();
  const dryRun = opts?.dryRun === true || opts?.runType === "dry_run";
  const runType: PricingRunType = opts?.runType ?? (dryRun ? "dry_run" : "manual");
  const startedAt = new Date().toISOString();
  const runId = await createPricingRun({
    runType,
    status: "running",
    startedAt,
    completedAt: null,
    triggeredBy: opts?.triggeredBy ?? "system",
    totalTargets: 0,
    successfulTargets: 0,
    failedTargets: 0,
    skippedTargets: 0,
    suggestionsCreated: 0,
    pricesUpdated: 0,
    dryRun,
    errorSummary: null,
    logs: [],
  });

  const logs: string[] = [];
  let successful = 0;
  let failed = 0;
  let skipped = 0;
  let suggestionsCreated = 0;
  let pricesUpdated = 0;

  try {
    if (settings.emergencyPause && !dryRun && runType === "weekly") {
      logs.push("Skipped: emergency pause enabled");
      await updatePricingRun(runId, {
        status: "cancelled",
        completedAt: new Date().toISOString(),
        logs,
        errorSummary: "emergency_pause",
      });
      await releaseRunLock(leaseId, "cancelled");
      return { ok: true, runId, suggestionsCreated: 0, pricesUpdated: 0 };
    }

    let targets = await listActivePricingTargets();
    if (opts?.targetIds?.length) {
      const set = new Set(opts.targetIds);
      targets = targets.filter((t) => set.has(t.id));
    }

    await updatePricingRun(runId, { totalTargets: targets.length });

    for (const target of targets) {
      try {
        const suggestionId = db.collection("pricingSuggestions").doc().id;
        const rules = await getPackagePricingRules(target.id);
        const snapshots = await researchMarketPrices({
          target,
          maxSources: settings.maxSourcesPerTarget,
          suggestionId,
        });
        await saveCompetitorSnapshots(snapshots);

        const ai = await recommendPriceWithAi({ target, snapshots });
        const safety = applySafetyRules({
          currentPrice: target.currentPrice,
          suggestedPrice: ai.recommendedPrice,
          confidence: ai.confidenceScore,
          sourceCount: ai.sourceCount,
          settings,
          rules,
          costFloorInr: rules?.costFloorInr ?? Math.round(target.currentPrice * 0.5),
        });

        const finalPrice = safety.adjustedPrice;
        const diff = finalPrice - target.currentPrice;
        const pct = target.currentPrice > 0 ? (diff / target.currentPrice) * 100 : 0;

        const packageAuto =
          rules?.autoApprovalMode === "enabled"
            ? true
            : rules?.autoApprovalMode === "manual"
              ? false
              : settings.autoApproveEnabled;

        const autoEligible =
          safety.autoApproveEligible &&
          packageAuto &&
          !dryRun &&
          safety.ok &&
          ai.recommendation !== "keep" &&
          ai.recommendation !== "insufficient_data" &&
          Math.abs(diff) >= 1;

        let status: PricingSuggestion["status"] = "pending";
        if (!safety.ok || ai.recommendation === "insufficient_data") {
          status = "skipped";
          skipped += 1;
        } else if (Math.abs(diff) < 1 || ai.recommendation === "keep") {
          status = "kept";
          skipped += 1;
        }

        const suggestion: PricingSuggestion = {
          id: suggestionId,
          runId,
          targetId: target.id,
          kind: target.kind,
          name: target.name,
          category: target.category,
          imageUrl: target.imageUrl,
          currentPrice: target.currentPrice,
          suggestedPrice: finalPrice,
          marketMinimum: ai.marketMinimum,
          marketMedian: ai.marketMedian,
          marketMaximum: ai.marketMaximum,
          weightedMarketPrice: ai.weightedMarketPrice,
          differenceAmount: diff,
          differencePercent: Math.round(pct * 100) / 100,
          confidenceScore: ai.confidenceScore,
          sourceCount: ai.sourceCount,
          recommendation: ai.recommendation,
          reason: ai.reason,
          warnings: [...ai.warnings, ...safety.warnings],
          riskWarnings: safety.warnings,
          autoApproveEligible: autoEligible,
          autoApproved: false,
          status,
          skipReason: safety.skipReason,
          reviewedBy: null,
          reviewedAt: null,
          rejectionReason: null,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        };

        if (autoEligible && status === "pending") {
          const applied = await applyLiveCatalogPrice({
            targetId: target.id,
            newPrice: finalPrice,
            oldPrice: target.currentPrice,
            changeSource: "ai_auto",
            suggestionId,
            runId,
            approvedBy: "auto-approve",
            reason: ai.reason,
          });
          if (applied.ok) {
            suggestion.status = "auto_approved";
            suggestion.autoApproved = true;
            suggestion.reviewedBy = "auto-approve";
            suggestion.reviewedAt = new Date().toISOString();
            pricesUpdated += 1;
          } else {
            suggestion.warnings.push(applied.error);
            suggestion.status = "pending";
          }
        }

        await savePricingSuggestion(suggestion);
        if (suggestion.status !== "skipped" && suggestion.status !== "kept") {
          suggestionsCreated += 1;
        }
        successful += 1;
        logs.push(`${target.id}: ${suggestion.status} → ₹${finalPrice}`);
      } catch (e) {
        failed += 1;
        logs.push(
          `${target.id}: error ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    const completedAt = new Date().toISOString();
    const status =
      failed === 0 ? "success" : successful > 0 ? "partial" : "error";
    await updatePricingRun(runId, {
      status,
      completedAt,
      successfulTargets: successful,
      failedTargets: failed,
      skippedTargets: skipped,
      suggestionsCreated,
      pricesUpdated,
      logs: logs.slice(-200),
      errorSummary: failed ? `${failed} target(s) failed` : null,
    });

    await savePricingSettings({
      lastRunAt: completedAt,
      nextRunAt: computeNextTuesdayIstRunIso(new Date()),
    });

    if (settings.notifyOnComplete) {
      await sendPricingAgentNotifications({
        runId,
        status,
        suggestionsCreated,
        pricesUpdated,
        failed,
        dryRun,
      });
    }

    await releaseRunLock(leaseId, status);
    return { ok: true, runId, suggestionsCreated, pricesUpdated };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await updatePricingRun(runId, {
      status: "error",
      completedAt: new Date().toISOString(),
      errorSummary: msg,
      logs,
    });
    await releaseRunLock(leaseId, "error");
    return {
      ok: false,
      runId,
      error: msg,
      suggestionsCreated,
      pricesUpdated,
    };
  }
}
