import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { listSuggestions } from "@/lib/seo-intelligence/suggestions-store";
import type { SeoIntelSuggestionStatus } from "@/lib/seo-intelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status");
    let status: SeoIntelSuggestionStatus | SeoIntelSuggestionStatus[] | undefined;
    if (statusParam === "queue" || statusParam === "open") {
      // Active work only — hide after successful apply (see Applied Changes)
      status = [
        "pending_approval",
        "edited_by_admin",
        "approved",
        "auto_approved",
        "deferred",
        "draft",
        "needs_review",
        "applying",
      ];
    } else if (statusParam === "applied") {
      status = ["applied", "rolled_back", "failed"];
    } else if (statusParam) {
      status = statusParam as SeoIntelSuggestionStatus;
    }
    const suggestions = await listSuggestions({ status, limit: 300 });
    return NextResponse.json({
      suggestions,
      disclaimer:
        "Ranking impact is not guaranteed. Review every suggestion before apply.",
    });
  } catch (e) {
    console.error("[seo-intelligence/suggestions GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
