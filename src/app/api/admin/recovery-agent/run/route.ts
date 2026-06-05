import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { runRecoveryAgentPipeline } from "@/lib/recovery-agent/pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const result = await runRecoveryAgentPipeline();
  return NextResponse.json(result);
}
