import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { runPricingAgentPipeline } from "@/lib/pricing-agent/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { dryRun?: boolean; targetIds?: string[] } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const result = await runPricingAgentPipeline({
    runType: body.dryRun ? "dry_run" : "manual",
    dryRun: body.dryRun === true,
    triggeredBy: auth.uid,
    targetIds: Array.isArray(body.targetIds) ? body.targetIds.map(String) : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Pricing run failed", runId: result.runId },
      { status: 409 },
    );
  }

  return NextResponse.json(result);
}
