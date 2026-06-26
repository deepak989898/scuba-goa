import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { runSeoBlogCenterDailyPipeline } from "@/lib/seo-blog-center/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await runSeoBlogCenterDailyPipeline(auth.uid);
  return NextResponse.json({ ok: true, ...result });
}
