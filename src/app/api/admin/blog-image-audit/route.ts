import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  classifyVisualCategory,
  categorySuggestsWrongTopic,
  hammingHex,
  listRecentImageRegistry,
  similarityFromHamming,
} from "@/lib/blog-automation/image-pipeline";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Audit existing blog hero images for duplicates / wrong-topic assignments.
 * Does NOT regenerate — returns a report for admin confirmation.
 */
export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(20, Number(url.searchParams.get("limit")) || 100));

  const snap = await db.collection("blogPosts").limit(limit).get();
  const posts = snap.docs.map((d) => {
    const data = d.data();
    return {
      slug: d.id,
      title: String(data.title ?? ""),
      featuredImageUrl: String(data.featuredImageUrl ?? ""),
      serviceSlug: String(data.serviceSlug ?? ""),
      published: data.published === true,
      imageMeta:
        data.imageMeta && typeof data.imageMeta === "object"
          ? (data.imageMeta as Record<string, unknown>)
          : null,
    };
  });

  const registry = await listRecentImageRegistry(300);
  const urlCounts = new Map<string, string[]>();
  for (const p of posts) {
    if (!p.featuredImageUrl) continue;
    const list = urlCounts.get(p.featuredImageUrl) || [];
    list.push(p.slug);
    urlCounts.set(p.featuredImageUrl, list);
  }

  const exactUrlDuplicates = [...urlCounts.entries()]
    .filter(([, slugs]) => slugs.length > 1)
    .map(([imageUrl, slugs]) => ({ imageUrl, slugs, count: slugs.length }));

  const rows = posts.map((p) => {
    const classification = classifyVisualCategory({
      title: p.title,
      serviceSlug: p.serviceSlug,
    });
    const storedCategory = String(p.imageMeta?.visualCategory || "");
    const wrongTopic =
      categorySuggestsWrongTopic(classification.visualCategory, p.title) ||
      (storedCategory.startsWith("scuba") &&
        categorySuggestsWrongTopic("scuba_diving", p.title));

    const ph = String(p.imageMeta?.perceptualHash || "");
    let nearDup: { matchedSlug?: string; similarity?: number } | null = null;
    if (ph) {
      for (const r of registry) {
        if (r.articleId === p.slug || !r.perceptualHash) continue;
        const sim = similarityFromHamming(
          hammingHex(ph, r.perceptualHash),
          ph.length,
        );
        if (sim >= 90) {
          nearDup = { matchedSlug: r.slug || r.articleId, similarity: sim };
          break;
        }
      }
    }

    const sharedUrl = (urlCounts.get(p.featuredImageUrl)?.length || 0) > 1;
    const action =
      wrongTopic || sharedUrl || nearDup
        ? "Regeneration required"
        : p.imageMeta?.imageStatus === "needs_manual_review"
          ? "Manual review"
          : "OK";

    return {
      slug: p.slug,
      title: p.title,
      published: p.published,
      featuredImageUrl: p.featuredImageUrl,
      suggestedVisualCategory: classification.visualCategory,
      storedVisualCategory: storedCategory || null,
      wrongTopic,
      sharedExactUrl: sharedUrl,
      nearDuplicate: nearDup,
      relevanceScore: p.imageMeta?.relevanceScore ?? null,
      uniquenessScore: p.imageMeta?.uniquenessScore ?? null,
      recommendedAction: action,
    };
  });

  const needingRegen = rows.filter((r) => r.recommendedAction === "Regeneration required");

  return NextResponse.json({
    ok: true,
    scanned: posts.length,
    exactUrlDuplicateGroups: exactUrlDuplicates.length,
    exactUrlDuplicates,
    nearDuplicateCount: rows.filter((r) => r.nearDuplicate).length,
    wrongTopicCount: rows.filter((r) => r.wrongTopic).length,
    regenerationRequired: needingRegen.length,
    note: "Unique images alone do not guarantee Google indexing.",
    rows,
  });
}
