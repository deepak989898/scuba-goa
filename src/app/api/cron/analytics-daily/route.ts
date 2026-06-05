import { NextResponse } from "next/server";
import { runAiAnalyticsDailyPipeline } from "@/lib/ai-analytics/pipeline";
import { verifyCronRequest } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAiAnalyticsDailyPipeline();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    dateIst: result.dateIst,
    message: `Daily AI analytics saved for ${result.dateIst}`,
  });
}
