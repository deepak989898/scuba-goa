import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  applyBlogRankingUpdate,
  generateBlogRankingImprove,
  generateBlogRankingImproveBulk,
  suggestBlogRankingUpdate,
  type RankingImproveFields,
} from "@/lib/gsc-indexing-agent/ranking-improve";
import {
  DEFAULT_BULK_SEO_IMPROVE_BATCH,
  MAX_BULK_SEO_IMPROVE_PER_REQUEST,
} from "@/lib/gsc-indexing-agent/blog-ranking-improve-ui";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Blog posts table — ranking SEO improve:
 * POST { action: "suggest", slug } → suggestions only (no write)
 * POST { action: "apply", slug, fields } → apply after admin confirms
 * POST { action: "generate", slug } → AI improve title/meta/content (no images) + save
 * POST { action: "generateBulk", slugs, maxJobs? } → bulk generate (up to 100 per call)
 */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    action?: string;
    slug?: string;
    slugs?: string[];
    maxJobs?: number;
    fields?: RankingImproveFields;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "").trim();

  try {
    if (action === "generateBulk") {
      const slugs = Array.isArray(body.slugs)
        ? body.slugs.map(String).filter(Boolean)
        : [];
      if (slugs.length === 0) {
        return NextResponse.json(
          { error: "slugs array required" },
          { status: 400 },
        );
      }
      const maxJobs = Math.min(
        MAX_BULK_SEO_IMPROVE_PER_REQUEST,
        Math.max(
          1,
          Number(body.maxJobs) || DEFAULT_BULK_SEO_IMPROVE_BATCH,
        ),
      );
      const result = await generateBlogRankingImproveBulk(slugs, maxJobs);
      return NextResponse.json({
        ok: true,
        ...result,
        maxJobsPerRequest: maxJobs,
        cap: MAX_BULK_SEO_IMPROVE_PER_REQUEST,
      });
    }

    const slug = String(body.slug ?? "").trim();
    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

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
      return NextResponse.json(result);
    }
    if (action === "generate") {
      const result = await generateBlogRankingImprove(slug);
      return NextResponse.json({ ok: true, ...result });
    }
    return NextResponse.json(
      {
        error:
          'action must be "suggest", "apply", "generate", or "generateBulk"',
      },
      { status: 400 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 400 },
    );
  }
}
