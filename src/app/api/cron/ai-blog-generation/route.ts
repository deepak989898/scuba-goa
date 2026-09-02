import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runAutoApprovePublishAutomation } from "@/lib/seo-blog-center/auto-approve-publish";
import { processGenerationQueue } from "@/lib/seo-blog-center/generation-queue";
import {
  runScheduledAutomation,
  shouldRunScheduledAutomation,
} from "@/lib/seo-blog-center/scheduled-automation";
import { addSeoBlogLog, getSeoBlogSettings } from "@/lib/seo-blog-center/store";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Cron: scheduled research (when due) + always auto-approve pending clusters (if enabled)
 * + process waiting generation jobs.
 */
export async function POST(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cfg = await getSeoBlogSettings();
    let scheduled: Awaited<ReturnType<typeof runScheduledAutomation>> | null = null;

    if (
      cfg.automationScheduleEnabled &&
      shouldRunScheduledAutomation(cfg)
    ) {
      scheduled = await runScheduledAutomation({ actorId: "cron-scheduled" });
    }

    // Always auto-queue pending clusters when automation toggles are on —
    // even if scheduled research already ran today (was the main stuck-clusters bug).
    const auto = await runAutoApprovePublishAutomation("cron-auto");

    const processMax = cfg.automationScheduleEnabled
      ? Math.min(cfg.automationPostsPerDay ?? 5, 8)
      : 5;
    const queue = await processGenerationQueue(processMax, {
      skipPauseCheck: true,
    });

    await addSeoBlogLog({
      type: "pipeline_run",
      message: `AI cron: scheduled=${scheduled?.skipped ? "skipped" : scheduled ? `+${scheduled.keywordsAdded}kw` : "off"}; auto mode=${auto.mode} queued=${auto.result?.jobsCreated ?? 0}; processed ${queue.processed}`,
    });

    return NextResponse.json({
      ok: true,
      scheduled,
      autoApprove: {
        mode: auto.mode,
        processed: auto.processed ?? 0,
        ...(auto.result ?? {}),
      },
      ...queue,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cron failed";
    await addSeoBlogLog({ type: "error", message, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
