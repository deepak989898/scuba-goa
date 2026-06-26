import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  approveKeyword,
  rejectKeyword,
} from "@/lib/seo-blog-center/pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  let body: { action?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action?.trim();
  if (action === "approve") {
    const result = await approveKeyword(id, auth.uid);
    return NextResponse.json({ ok: true, ...result });
  }
  if (action === "reject") {
    await rejectKeyword(id, body.reason);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
}
