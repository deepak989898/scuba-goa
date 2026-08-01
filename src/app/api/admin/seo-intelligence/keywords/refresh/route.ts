import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { refreshKeywordRankings } from "@/lib/seo-intelligence/refresh-rankings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      limit?: number;
      focus?: "opportunity" | "owned";
    };
    const result = await refreshKeywordRankings({
      actor: auth.uid,
      limit: Math.min(25, Math.max(1, Number(body.limit) || 12)),
      focus: body.focus === "owned" ? "owned" : "opportunity",
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[seo-intelligence/keywords/refresh]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Refresh failed" },
      { status: 500 },
    );
  }
}
