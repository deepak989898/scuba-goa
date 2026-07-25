import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runGscAgentJob } from "@/lib/gsc-indexing-agent";
import type { AgentJob } from "@/lib/gsc-indexing-agent/pipeline";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * GSC Indexing & Ranking Agent cron.
 * Query: ?job=daily|weekly|inventory|inspect|audit|auto_fix|analytics|sitemap
 * Auth: Authorization: Bearer CRON_SECRET
 *
 * Never uses Google Indexing API for blog pages.
 */
export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = (new URL(req.url).searchParams.get("job") || "daily") as AgentJob;
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
  if (!allowed.includes(job)) {
    return NextResponse.json({ error: "Invalid job" }, { status: 400 });
  }

  const result = await runGscAgentJob(job);

  const db = getAdminDb();
  if (db) {
    await db
      .collection("cronRunStatus")
      .doc("gsc-indexing-agent")
      .set(
        {
          lastRunAt: new Date().toISOString(),
          lastJob: job,
          ok: result.ok,
          detail: result.detail,
        },
        { merge: true },
      );
  }

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  return GET(req);
}
