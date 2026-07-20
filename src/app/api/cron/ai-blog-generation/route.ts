import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { processGenerationQueue } from "@/lib/seo-blog-center/generation-queue";
import { addSeoBlogLog } from "@/lib/seo-blog-center/store";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * External cron: process 1–2 AI blog generation jobs per tick.
 * Authorization: Bearer ${CRON_SECRET}
 */
export async function POST(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processGenerationQueue(2);
    await addSeoBlogLog({
      type: "pipeline_run",
      message: `AI generation cron: processed ${result.processed}`,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cron failed";
    await addSeoBlogLog({ type: "error", message, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
