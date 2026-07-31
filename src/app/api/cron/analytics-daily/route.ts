import { NextResponse } from "next/server";
import { runAiAnalyticsDailyPipeline } from "@/lib/ai-analytics/pipeline";
import { runConversionOptPipeline } from "@/lib/conversion-opt/pipeline";
import { verifyCronRequest } from "@/lib/cron-auth";
import { scheduleCronTask } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    const host = new URL(req.url).host;
    console.warn(
      `[cron:analytics-daily] 401 Unauthorized on host=${host}. Use https://www.bookscubagoa.com/api/cron/analytics-daily with Authorization: Bearer <CRON_SECRET> (apex redirects drop the header).`,
    );
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint: "Use www host + Bearer CRON_SECRET (or X-Cron-Secret). Apex bookscubagoa.com 308-redirects and often drops Authorization.",
      },
      { status: 401 },
    );
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
