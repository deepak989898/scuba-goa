import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import type { RankingImproveFields } from "@/lib/gsc-indexing-agent/ranking-improve";
import {
  applyPendingBlogOptimize,
  aiFixPendingBlog,
  diagnosePendingBlog,
  listPendingIndexBlogs,
  requestIndexRecheck,
  suggestPendingBlogOptimize,
} from "@/lib/gsc-indexing-agent/pending-index-optimize";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Pending Index Optimizer AI
 *
 * POST actions:
 * - list { includeAiFixed? }
 * - diagnose { slug }
 * - suggest { slug }
 * - apply { slug, fields }
 * - reinspect { slugs[], immediate? } — max 5 immediate (avoid 504)
 * - auto { slug, inspect? } — AI apply (+ optional inspect)
 * - aiFix { slug, inspect? } — same as auto (explicit name)
 * - autoBatch { max?, slugs?, inspect? } — small server batch (prefer client 1-by-1)
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
    fields?: RankingImproveFields;
    immediate?: boolean;
    max?: number;
    inspect?: boolean;
    includeAiFixed?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "").trim();

  try {
    if (action === "list") {
      const result = await listPendingIndexBlogs(50, {
        includeAiFixed: body.includeAiFixed === true,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "diagnose") {
      const slug = String(body.slug ?? "").trim();
      if (!slug) {
        return NextResponse.json({ error: "slug required" }, { status: 400 });
      }
      const diagnose = await diagnosePendingBlog(slug);
      return NextResponse.json({ ok: true, diagnose });
    }

    if (action === "suggest") {
      const slug = String(body.slug ?? "").trim();
      if (!slug) {
        return NextResponse.json({ error: "slug required" }, { status: 400 });
      }
      const result = await suggestPendingBlogOptimize(slug);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "apply") {
      const slug = String(body.slug ?? "").trim();
      if (!slug || !body.fields) {
        return NextResponse.json(
          { error: "slug and fields required" },
          { status: 400 },
        );
      }
      const result = await applyPendingBlogOptimize(slug, body.fields);
      return NextResponse.json(result);
    }

    if (action === "reinspect") {
      const slugs = Array.isArray(body.slugs)
        ? body.slugs.map((s) => String(s).trim()).filter(Boolean)
        : body.slug
          ? [String(body.slug).trim()]
          : [];
      if (!slugs.length) {
        return NextResponse.json({ error: "slugs required" }, { status: 400 });
      }
      // Keep small to avoid gateway 504 timeouts.
      const capped = slugs.slice(0, 5);
      const result = await requestIndexRecheck(capped, {
        immediate: body.immediate !== false,
        maxImmediate: Math.min(5, capped.length),
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "auto" || action === "aiFix") {
      const slug = String(body.slug ?? "").trim();
      if (!slug) {
        return NextResponse.json({ error: "slug required" }, { status: 400 });
      }
      const result = await aiFixPendingBlog(slug, {
        inspect: body.inspect === true,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "autoBatch") {
      const selectedSlugs = Array.isArray(body.slugs)
        ? body.slugs
            .map((s) => String(s).trim())
            .filter(Boolean)
            .slice(0, 3)
        : [];
      const max = Math.min(
        3,
        Math.max(1, Number(body.max) || (selectedSlugs.length ? selectedSlugs.length : 3)),
      );
      const { items, inspectionQuota } = await listPendingIndexBlogs(50, {
        includeAiFixed: true,
      });
      const statusBySlug = new Map(
        items.map((i) => [i.slug, i.indexStatus] as const),
      );
      const targetSlugs =
        selectedSlugs.length > 0
          ? selectedSlugs.slice(0, max)
          : items.slice(0, max).map((i) => i.slug);
      const results: Array<{
        slug: string;
        ok: boolean;
        error?: string;
        seoBefore?: number;
        seoAfter?: number;
        indexStatus?: string;
      }> = [];

      for (const slug of targetSlugs) {
        try {
          const r = await aiFixPendingBlog(slug, {
            inspect: body.inspect === true,
          });
          results.push({
            slug,
            ok: true,
            seoBefore: r.diagnoseBefore.seo.score,
            seoAfter: r.diagnoseAfter.seo.score,
            indexStatus:
              r.reinspect?.inspected[0]?.indexStatus ??
              statusBySlug.get(slug) ??
              "",
          });
        } catch (e) {
          results.push({
            slug,
            ok: false,
            error: e instanceof Error ? e.message : "Failed",
          });
        }
      }

      return NextResponse.json({
        ok: true,
        results,
        inspectionQuota,
        note: "AI fix applied + published/updated. Inspect separately within daily quota to avoid 504.",
      });
    }

    return NextResponse.json(
      {
        error:
          "action must be list|diagnose|suggest|apply|reinspect|auto|aiFix|autoBatch",
      },
      { status: 400 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Optimizer failed" },
      { status: 400 },
    );
  }
}
