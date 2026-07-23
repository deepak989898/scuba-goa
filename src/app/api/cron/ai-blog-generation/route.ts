import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runAutoApprovePublishAutomation } from "@/lib/seo-blog-center/auto-approve-publish";
import { processGenerationQueue } from "@/lib/seo-blog-center/generation-queue";
import { addSeoBlogLog } from "@/lib/seo-blog-center/store";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * External cron: auto-approve eligible clusters (if enabled), then process 1–2 jobs.
 * Authorization: Bearer ${CRON_SECRET}
 */
export async function POST(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const auto = await runAutoApprovePublishAutomation("cron-auto");
    const result = await processGenerationQueue(2);
    await addSeoBlogLog({
      type: "pipeline_run",
      message: `AI generation cron: auto-approve mode=${auto.mode} queued=${auto.result?.jobsCreated ?? 0} (skipped conflicts=${auto.result?.skippedConflicts ?? 0}); processed ${result.processed}`,
    });
    return NextResponse.json({
      ok: true,
      autoApprove: {
        mode: auto.mode,
        ...(auto.result ?? {}),
      },
      ...result,
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
