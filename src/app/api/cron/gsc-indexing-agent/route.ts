import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runGscAgentJob } from "@/lib/gsc-indexing-agent";
import type { AgentJob } from "@/lib/gsc-indexing-agent/pipeline";
import { getSeoSettings } from "@/lib/gsc-indexing-agent/settings";
import { runGscScheduledAutomation } from "@/lib/gsc-indexing-agent/scheduled-automation";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * GSC Indexing & Ranking Agent cron.
 * Query: ?job=daily|weekly|inventory|inspect|audit|auto_fix|analytics|sitemap
 * Auth: Authorization: Bearer CRON_SECRET
 *
 * When GSC automation is enabled, also runs scheduled sync → inspect → ranking improve.
 */
export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = (new URL(req.url).searchParams.get("job") || "daily") as AgentJob;
  const allowed: AgentJob[] = [
    "inventory",
    "inspect",
    "audit",
    "auto_fix",
    "analytics",
    "sitemap",
    "daily",
    "weekly",
  ];
  if (!allowed.includes(job)) {
    return NextResponse.json({ error: "Invalid job" }, { status: 400 });
  }

  const result = await runGscAgentJob(job);

  let automation: Awaited<ReturnType<typeof runGscScheduledAutomation>> | null =
    null;
  const seoSettings = await getSeoSettings();
  if (seoSettings.automationScheduleEnabled) {
    automation = await runGscScheduledAutomation({ actorId: "cron" });
  }

  const db = getAdminDb();
  if (db) {
    await db
      .collection("cronRunStatus")
      .doc("gsc-indexing-agent")
      .set(
        {
          lastRunAt: new Date().toISOString(),
          lastJob: job,
          ok: result.ok,
          detail: result.detail,
          automation: automation?.skipped
            ? { skipped: true, reason: automation.skipReason }
            : automation
              ? {
                  rankingImproved: automation.rankingImproved,
                  openAiImageAttention: automation.openAiImageAttention,
                }
              : null,
        },
        { merge: true },
      );
  }

  return NextResponse.json({ ...result, automation });
}

export async function POST(req: Request) {
  return GET(req);
}
