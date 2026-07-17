import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runSeoBlogCenterDailyPipeline } from "@/lib/seo-blog-center/pipeline";
import { scheduleCronTask } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  scheduleCronTask("seo-blog-center-daily", () =>
    runSeoBlogCenterDailyPipeline("cron"),
  );
  return NextResponse.json(
    { ok: true, accepted: true, task: "seo-blog-center-daily" },
    { status: 202 },
  );
}
