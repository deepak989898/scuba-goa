import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { decideApproval, listApprovals } from "@/lib/gsc-indexing-agent";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const status = new URL(req.url).searchParams.get("status") || "pending";
  const approvals = await listApprovals(status, 200);
  return NextResponse.json({ approvals });
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  let body: { approvalId?: string; decision?: "approved" | "rejected" } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.approvalId || !body.decision) {
    return NextResponse.json(
      { error: "approvalId and decision required" },
      { status: 400 },
    );
  }
  const result = await decideApproval({
    approvalId: body.approvalId,
    decision: body.decision,
    adminUid: auth.uid,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
