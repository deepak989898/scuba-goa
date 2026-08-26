import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  resolveGscIssue,
  resolveGscIssuesBatch,
} from "@/lib/gsc-indexing-agent/resolve-issues";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    issueId?: string;
    issueIds?: string[];
    all?: boolean;
    severity?: string;
    max?: number;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (body.issueId) {
      const result = await resolveGscIssue(body.issueId);
      return NextResponse.json(result);
    }

    const batch = await resolveGscIssuesBatch({
      issueIds: body.issueIds,
      all: body.all,
      severity: body.severity,
      max: body.max,
    });
    return NextResponse.json(batch);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Resolve failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
