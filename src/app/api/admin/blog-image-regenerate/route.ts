import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { parseBlogPostFromFirestore } from "@/lib/blog-firestore";
import {
  blogPostNeedsImageRegenerate,
  regenerateBlogPostFeaturedImage,
} from "@/lib/blog-automation/regenerate-blog-image";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    slugs?: string[];
    missingOnly?: boolean;
    useStock?: boolean;
    max?: number;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const useStock = body.useStock !== false;
  const max = Math.min(20, Math.max(1, Number(body.max) || 10));
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  let slugs = Array.isArray(body.slugs)
    ? body.slugs.map((s) => String(s).trim()).filter(Boolean)
    : [];

  if (slugs.length === 0 && body.missingOnly) {
    const snap = await db.collection("blogPosts").get();
    slugs = snap.docs
      .map((d) =>
        parseBlogPostFromFirestore(d.id, d.data() as Record<string, unknown>, {
          requirePublished: false,
        }),
      )
      .filter((p): p is NonNullable<typeof p> => p != null)
      .filter((p) => blogPostNeedsImageRegenerate(p))
      .map((p) => p.slug)
      .slice(0, max);
  }

  if (slugs.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      failed: 0,
      results: [],
      message: "No matching blog posts to regenerate",
    });
  }

  const targets = slugs.slice(0, max);
  const results: Array<{
    slug: string;
    ok: boolean;
    featuredImageUrl?: string;
    source?: string;
    error?: string;
  }> = [];

  let processed = 0;
  let failed = 0;

  for (const slug of targets) {
    const r = await regenerateBlogPostFeaturedImage(slug, { useStock });
    results.push({
      slug,
      ok: r.ok,
      featuredImageUrl: r.featuredImageUrl,
      source: r.source,
      error: r.error,
    });
    if (r.ok) processed += 1;
    else failed += 1;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return NextResponse.json({
    ok: true,
    processed,
    failed,
    useStock,
    results,
  });
}
