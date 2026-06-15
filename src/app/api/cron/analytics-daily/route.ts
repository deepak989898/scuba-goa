import { NextResponse } from "next/server";
import { runAiAnalyticsDailyPipeline } from "@/lib/ai-analytics/pipeline";
import { runConversionOptPipeline } from "@/lib/conversion-opt/pipeline";
import { verifyCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [analyticsResult, conversionResult] = await Promise.all([
    runAiAnalyticsDailyPipeline(),
    runConversionOptPipeline(),
  ]);

  if (!analyticsResult.ok) {
    return NextResponse.json({ error: analyticsResult.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    dateIst: analyticsResult.dateIst,
    notifications: analyticsResult.notifications,
    conversionOk: conversionResult.ok,
    conversionError: conversionResult.error,
    message: `Daily AI analytics + conversion opt saved for ${analyticsResult.dateIst}`,
  });
}
