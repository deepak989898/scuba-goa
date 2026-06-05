import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { runCommandCenterPipeline } from "@/lib/command-center/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { dateIst?: string } = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    /* ignore */
  }

  const result = await runCommandCenterPipeline({ dateIst: body.dateIst });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
