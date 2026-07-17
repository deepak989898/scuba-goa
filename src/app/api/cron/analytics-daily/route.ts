import { NextResponse } from "next/server";
import { runAiAnalyticsDailyPipeline } from "@/lib/ai-analytics/pipeline";
import { runConversionOptPipeline } from "@/lib/conversion-opt/pipeline";
import { verifyCronRequest } from "@/lib/cron-auth";
import { scheduleCronTask } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  scheduleCronTask("analytics-daily", async () => {
    const [analyticsResult, conversionResult] = await Promise.all([
      runAiAnalyticsDailyPipeline(),
      runConversionOptPipeline(),
    ]);
    if (!analyticsResult.ok) {
      throw new Error(analyticsResult.error ?? "AI analytics failed");
    }
    return { analyticsResult, conversionResult };
  });

  return NextResponse.json(
    { ok: true, accepted: true, task: "analytics-daily" },
    { status: 202 },
  );
}
