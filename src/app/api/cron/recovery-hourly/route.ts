import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runRecoveryAgentPipeline } from "@/lib/recovery-agent/pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runRecoveryAgentPipeline();
  return NextResponse.json({
    ok: result.ok,
    sent: result.sent,
    skipped: result.skipped,
    errors: result.errors,
  });
}
