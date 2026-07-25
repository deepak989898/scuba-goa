import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { disconnectGsc } from "@/lib/gsc-indexing-agent";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  await disconnectGsc();
  return NextResponse.json({ ok: true });
}
