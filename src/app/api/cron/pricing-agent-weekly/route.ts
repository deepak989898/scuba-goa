import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { scheduleCronTask } from "@/lib/cron-runner";
import { runPricingAgentPipeline } from "@/lib/pricing-agent/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Tuesday 06:00 IST = 00:30 UTC — configure via cron-job.org (Hobby). */
export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  scheduleCronTask("pricing-agent-weekly", () =>
    runPricingAgentPipeline({
      runType: "weekly",
      triggeredBy: "cron",
    }),
  );

  return NextResponse.json(
    { ok: true, accepted: true, task: "pricing-agent-weekly" },
    { status: 202 },
  );
}
