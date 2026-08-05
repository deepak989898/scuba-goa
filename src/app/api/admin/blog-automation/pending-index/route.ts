import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import type { RankingImproveFields } from "@/lib/gsc-indexing-agent/ranking-improve";
import {
  applyPendingBlogOptimize,
  autoOptimizePendingBlog,
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
 * - list
 * - diagnose { slug }
 * - suggest { slug }
 * - apply { slug, fields }
 * - reinspect { slugs[], immediate? }
 * - auto { slug } — diagnose → AI apply → reinspect (quota-aware)
 * - autoBatch { max?, slugs? } — auto AI-fix up to N pending blogs (or selected slugs)
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
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "").trim();

  try {
    if (action === "list") {
      const result = await listPendingIndexBlogs(50);
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
      const result = await requestIndexRecheck(slugs.slice(0, 15), {
        immediate: body.immediate !== false,
        maxImmediate: Math.min(8, slugs.length),
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "auto") {
      const slug = String(body.slug ?? "").trim();
      if (!slug) {
        return NextResponse.json({ error: "slug required" }, { status: 400 });
      }
      const result = await autoOptimizePendingBlog(slug);
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "autoBatch") {
      const selectedSlugs = Array.isArray(body.slugs)
        ? body.slugs
            .map((s) => String(s).trim())
            .filter(Boolean)
            .slice(0, 10)
        : [];
      const max = Math.min(
        10,
        Math.max(1, Number(body.max) || (selectedSlugs.length ? selectedSlugs.length : 3)),
      );
      const { items, inspectionQuota } = await listPendingIndexBlogs(50);
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
          const r = await autoOptimizePendingBlog(slug);
          results.push({
            slug,
            ok: true,
            seoBefore: r.diagnoseBefore.seo.score,
            seoAfter: r.diagnoseAfter.seo.score,
            indexStatus:
              r.reinspect.inspected[0]?.indexStatus ??
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
        note: selectedSlugs.length
          ? "AI-fixed selected blogs (apply + URL Inspection). Cap 10 per run."
          : "Auto-batch applies AI content fixes then URL Inspection (status only — not Indexing API).",
      });
    }

    return NextResponse.json(
      {
        error:
          'action must be list|diagnose|suggest|apply|reinspect|auto|autoBatch',
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
