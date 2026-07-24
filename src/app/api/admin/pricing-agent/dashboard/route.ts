import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  computeNextTuesdayIstRunIso,
  getPricingSettings,
} from "@/lib/pricing-agent/settings";
import { listRuns, listSuggestions } from "@/lib/pricing-agent/store";
import { isSerperConfigured } from "@/lib/pricing-agent/market-research";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [settings, suggestions, runs] = await Promise.all([
    getPricingSettings(),
    listSuggestions(100),
    listRuns(15),
  ]);

  const pending = suggestions.filter((s) => s.status === "pending");
  const approved = suggestions.filter(
    (s) => s.status === "approved" || s.status === "auto_approved",
  );
  const rejected = suggestions.filter((s) => s.status === "rejected");
  const autoApproved = suggestions.filter((s) => s.status === "auto_approved");
  const skipped = suggestions.filter(
    (s) => s.status === "skipped" || s.status === "kept",
  );
  const lowConfidence = suggestions.filter(
    (s) => s.status === "pending" && s.confidenceScore < settings.minimumConfidence,
  );

  const increases = pending.filter((s) => s.differenceAmount > 0);
  const decreases = pending.filter((s) => s.differenceAmount < 0);
  const avgIncrease =
    increases.length > 0
      ? increases.reduce((a, s) => a + s.differencePercent, 0) / increases.length
      : 0;
  const avgDecrease =
    decreases.length > 0
      ? decreases.reduce((a, s) => a + s.differencePercent, 0) / decreases.length
      : 0;

  const serperConfigured = isSerperConfigured();

  return NextResponse.json({
    settings: {
      ...settings,
      nextRunAt: settings.nextRunAt || computeNextTuesdayIstRunIso(),
    },
    serperConfigured,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    cards: {
      totalAnalyzed: suggestions.length,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      autoApproved: autoApproved.length,
      skipped: skipped.length,
      lowConfidence: lowConfidence.length,
      lastRunAt: settings.lastRunAt,
      nextRunAt: settings.nextRunAt || computeNextTuesdayIstRunIso(),
      avgIncreasePercent: Math.round(avgIncrease * 10) / 10,
      avgDecreasePercent: Math.round(avgDecrease * 10) / 10,
    },
    suggestions,
    runs,
  });
}
