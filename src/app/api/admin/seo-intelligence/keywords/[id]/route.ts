import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getKeyword,
  listRankSnapshots,
} from "@/lib/seo-intelligence/keywords-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await ctx.params;
  try {
    const keyword = await getKeyword(id);
    if (!keyword) {
      return NextResponse.json({ error: "Keyword not found" }, { status: 404 });
    }
    const snapshots = await listRankSnapshots(id, 30);
    return NextResponse.json({
      keyword,
      snapshots,
      disclaimer:
        "Ranking impact is not guaranteed. SERP snapshots can vary by device and location.",
    });
  } catch (e) {
    console.error("[seo-intelligence/keywords/id]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load keyword" },
      { status: 500 },
    );
  }
}
