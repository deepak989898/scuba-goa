import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getSeoIntelDashboard } from "@/lib/seo-intelligence/dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const data = await getSeoIntelDashboard();
    return NextResponse.json(data);
  } catch (e) {
    console.error("[seo-intelligence/dashboard]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Dashboard failed" },
      { status: 500 },
    );
  }
}
