import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { buildContentOverview } from "@/lib/admin-content-overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const overview = await buildContentOverview();
    return NextResponse.json(overview);
  } catch (e) {
    console.error("[admin/content-overview]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load overview" },
      { status: 500 },
    );
  }
}
