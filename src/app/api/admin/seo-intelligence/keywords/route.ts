import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  filterContentGap,
  filterKeywordGap,
  filterOpportunities,
} from "@/lib/seo-intelligence/discover-keywords";
import { listKeywords } from "@/lib/seo-intelligence/keywords-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const url = new URL(req.url);
    const view = url.searchParams.get("view") || "all";
    const q = (url.searchParams.get("q") || "").toLowerCase().trim();
    const category = url.searchParams.get("category") || "";
    const intent = url.searchParams.get("intent") || "";
    const pageMatch = url.searchParams.get("pageMatch") || "";

    let keywords = await listKeywords({ status: "active" });
    if (view === "gap") keywords = filterKeywordGap(keywords);
    if (view === "content-gap") keywords = filterContentGap(keywords);
    if (view === "opportunities") keywords = filterOpportunities(keywords);

    if (q) {
      keywords = keywords.filter(
        (k) =>
          k.keyword.toLowerCase().includes(q) ||
          k.category.toLowerCase().includes(q) ||
          (k.existingPageUrl || "").toLowerCase().includes(q),
      );
    }
    if (category) {
      keywords = keywords.filter((k) => k.category === category);
    }
    if (intent) {
      keywords = keywords.filter((k) => k.intent === intent);
    }
    if (pageMatch) {
      keywords = keywords.filter((k) => k.pageMatchStatus === pageMatch);
    }

    const categories = [...new Set(keywords.map((k) => k.category))].sort();

    return NextResponse.json({
      keywords,
      categories,
      disclaimer:
        "Ranking impact is not guaranteed. Opportunity scores estimate potential only.",
    });
  } catch (e) {
    console.error("[seo-intelligence/keywords GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to list keywords" },
      { status: 500 },
    );
  }
}
