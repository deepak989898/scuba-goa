import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { istDateString, istYesterdayString } from "@/lib/ai-analytics/ist";
import { runSeoWeeklyPipeline } from "@/lib/seo-agent/pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { weekId?: string; days?: number; queueBlogTopics?: boolean } = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const weekId = body.weekId?.trim() || istYesterdayString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekId)) {
    return NextResponse.json({ error: "Invalid weekId" }, { status: 400 });
  }

  try {
    const result = await runSeoWeeklyPipeline({
      weekId,
      days: body.days,
      queueBlogTopics: body.queueBlogTopics === true,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Pipeline failed" }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      weekId: result.weekId,
      todayIst: istDateString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[seo-agent run]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

