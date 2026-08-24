import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  runGscAgentJob,
  proposeContentImprovements,
  listSeoUrls,
  submitSitemapsIfDue,
} from "@/lib/gsc-indexing-agent";
import type { AgentJob } from "@/lib/gsc-indexing-agent/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { job?: string; forceSitemap?: boolean; max?: number } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const job = (body.job || "daily") as AgentJob | "content_proposals";

  if (job === "content_proposals") {
    const urls = await listSeoUrls({ limit: 500 });
    const created = await proposeContentImprovements(urls, 20);
    return NextResponse.json({ ok: true, job, detail: { created } });
  }

  if (body.forceSitemap) {
    const detail = await submitSitemapsIfDue(true);
    return NextResponse.json({ ok: true, job: "sitemap", detail });
  }

  const allowed: AgentJob[] = [
    "inventory",
    "inspect",
    "audit",
    "auto_fix",
    "analytics",
    "sitemap",
    "daily",
    "weekly",
  ];
  if (!allowed.includes(job as AgentJob)) {
    return NextResponse.json({ error: "Invalid job" }, { status: 400 });
  }

  const result = await runGscAgentJob(job as AgentJob, {
    inspectMax:
      job === "inspect"
        ? Math.min(12, Math.max(1, Number(body.max) || 8))
        : undefined,
  });
  return NextResponse.json(result);
}
