import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runSeoBlogCenterDailyPipeline } from "@/lib/seo-blog-center/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSeoBlogCenterDailyPipeline("cron");
  return NextResponse.json({ ok: true, ...result });
}
