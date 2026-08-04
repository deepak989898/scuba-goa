import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  applyBlogRankingUpdate,
  suggestBlogRankingUpdate,
  type RankingImproveFields,
} from "@/lib/gsc-indexing-agent/ranking-improve";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Blog posts table — ranking Update flow:
 * POST { action: "suggest", slug } → suggestions only (no write)
 * POST { action: "apply", slug, fields } → apply after admin confirms
 */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    action?: string;
    slug?: string;
    fields?: RankingImproveFields;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "").trim();
  const slug = String(body.slug ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  try {
    if (action === "suggest") {
      const result = await suggestBlogRankingUpdate(slug);
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "apply") {
      if (!body.fields) {
        return NextResponse.json(
          { error: "fields required for apply" },
          { status: 400 },
        );
      }
      const result = await applyBlogRankingUpdate(slug, body.fields);
      return NextResponse.json({ ok: true, ...result });
    }
    return NextResponse.json(
      { error: 'action must be "suggest" or "apply"' },
      { status: 400 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 400 },
    );
  }
}
