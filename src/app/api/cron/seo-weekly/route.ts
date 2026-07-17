import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runSeoWeeklyPipeline } from "@/lib/seo-agent/pipeline";
import { scheduleCronTask } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  scheduleCronTask("seo-weekly", async () => {
    const result = await runSeoWeeklyPipeline();
    if (!result.ok) throw new Error(result.error ?? "Weekly SEO failed");
    return result;
  });
  return NextResponse.json(
    { ok: true, accepted: true, task: "seo-weekly" },
    { status: 202 },
  );
}

