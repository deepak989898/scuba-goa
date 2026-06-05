import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { rejectMarketingAction } from "@/lib/marketing-engine/campaign-workflow";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { actionId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const actionId = body.actionId?.trim();
  if (!actionId) {
    return NextResponse.json({ error: "actionId required" }, { status: 400 });
  }

  const result = await rejectMarketingAction(actionId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
