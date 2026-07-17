import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runBlogAutomationCron } from "@/lib/blog-automation/generate-post";
import { scheduleCronTask } from "@/lib/cron-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  scheduleCronTask("blog-publish", runBlogAutomationCron);
  return NextResponse.json(
    { ok: true, accepted: true, task: "blog-publish" },
    { status: 202 },
  );
}
