import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getGscTodayImpressions } from "@/lib/gsc-indexing-agent/today-impressions";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const data = await getGscTodayImpressions();
  return NextResponse.json(data);
}
