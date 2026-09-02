import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { generateFeaturedImageForArticle } from "@/lib/blog-automation/image-pipeline";
import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import {
  isValidBlogSlug,
  normalizeBlogSlugInput,
  parseBlogPostFromFirestore,
} from "@/lib/blog-firestore";
import { syncBlogImageToHomeGallery } from "@/lib/home-gallery-sync";
import { regenerateBlogPostFeaturedImage } from "@/lib/blog-automation/regenerate-blog-image";
import type { BlogImageMeta } from "@/lib/blog-automation/image-pipeline/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function revalidateBlogImagePaths(slug: string) {
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/blog");
  revalidatePath("/admin/blog-automation");
  revalidatePath("/admin/ai-blog-automation");
}

async function persistFeaturedImage(
  slug: string,
  existing: Record<string, unknown>,
  meta: BlogImageMeta,
) {
  const db = getAdminDb();
  if (!db) throw new Error("Database not configured");

  const ref = db.collection("blogPosts").doc(slug);
  const previousUrl = String(existing.featuredImageUrl ?? "").trim();
  const previousMeta =
    existing.imageMeta && typeof existing.imageMeta === "object"
      ? (existing.imageMeta as Record<string, unknown>)
      : null;
  const now = new Date().toISOString();
  const history = Array.isArray(previousMeta?.history)
    ? [...(previousMeta.history as unknown[])]
    : [];
  if (previousUrl) {
    history.unshift({
      imageUrl: previousUrl,
      sha256: previousMeta?.sha256,
      createdAt: String(previousMeta?.createdAt || existing.updatedAt || now),
      reason: "replaced_by_regenerate",
    });
  }

  const imageMeta = {
    ...meta,
    history: history.slice(0, 10),
  };

  await ref.set(
    stripUndefinedDeep({
      featuredImageUrl: meta.imageUrl,
      ogImageUrl: meta.ogImageUrl,
      featuredImageAlt: meta.imageAlt,
      imageMeta,
      updatedAt: now,
    }),
    { merge: true },
  );

  const post = parseBlogPostFromFirestore(
    slug,
    {
      ...existing,
      featuredImageUrl: meta.imageUrl,
      ogImageUrl: meta.ogImageUrl,
      featuredImageAlt: meta.imageAlt,
      imageMeta,
    },
    { requirePublished: false },
  );
  if (post?.published && meta.imageUrl) {
    try {
      await syncBlogImageToHomeGallery({
        blogSlug: slug,
        title: post.title,
        featuredImageUrl: meta.imageUrl,
        serviceSlug: post.serviceSlug,
        published: true,
      });
    } catch (e) {
      console.error("[blog-image-generate] gallery sync:", e);
    }
  }

  return imageMeta;
}

/**
 * Generate a topic-specific featured image and update the blog post.
 * useStock=true → stock only (free).
 * forceOpenAi=true → OpenAI only (paid).
 * Default → free stock first; OpenAI only if stock fails (saves API cost).
 */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    slug?: string;
    title?: string;
    brandingEnabled?: boolean;
    allowPexelsFallback?: boolean;
    useStock?: boolean;
    forceOpenAi?: boolean;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slug = normalizeBlogSlugInput(String(body.slug ?? "").trim());
  if (!isValidBlogSlug(slug)) {
    return NextResponse.json({ error: "Valid slug required" }, { status: 400 });
  }

  if (body.useStock === true) {
    const result = await regenerateBlogPostFeaturedImage(slug, {
      title: body.title,
      useStock: true,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Stock image failed" }, {
        status: 500,
      });
    }
    revalidateBlogImagePaths(slug);
    return NextResponse.json({
      ok: true,
      featuredImageUrl: result.featuredImageUrl,
      ogImageUrl: result.ogImageUrl,
      featuredImageAlt: result.featuredImageAlt,
      source: result.source,
    });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const ref = db.collection("blogPosts").doc(slug);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: "Blog post not found. Save the blog first, then generate an image." },
      { status: 404 },
    );
  }

  const existing = snap.data() as Record<string, unknown>;
  const title =
    String(body.title ?? "").trim() ||
    String(existing.title ?? "").trim();
  if (!title) {
    return NextResponse.json(
      { error: "Blog title is required to generate an image" },
      { status: 400 },
    );
  }

  // Free stock first (topic-matched) unless admin explicitly requests OpenAI.
  if (body.forceOpenAi !== true) {
    const stock = await regenerateBlogPostFeaturedImage(slug, {
      title,
      useStock: true,
    });
    if (stock.ok && stock.featuredImageUrl) {
      revalidateBlogImagePaths(slug);
      return NextResponse.json({
        ok: true,
        featuredImageUrl: stock.featuredImageUrl,
        ogImageUrl: stock.ogImageUrl,
        featuredImageAlt: stock.featuredImageAlt,
        source: stock.source,
        costNote: "Used free stock photo — no OpenAI charge.",
      });
    }
  }

  try {
    const result = await generateFeaturedImageForArticle({
      articleId: slug,
      slug,
      title,
      primaryKeyword: Array.isArray(existing.keywords)
        ? String(existing.keywords[0] || title)
        : title,
      serviceSlug: String(existing.serviceSlug ?? ""),
      serviceName: String(existing.serviceSlug ?? "").replace(/-/g, " "),
      contentExcerpt: String(existing.content ?? "").slice(0, 600),
      brandingEnabled: body.brandingEnabled !== false,
      allowPexelsFallback: body.allowPexelsFallback !== false,
      maxRetries: 2,
    });

    if (!result.meta) {
      return NextResponse.json(
        {
          error:
            result.error ||
            "Image generation failed after uniqueness checks. Each OpenAI attempt is billed even if the image was rejected.",
          attempts: result.attempts,
          costNote:
            "OpenAI image API charges per generation. Use Regenerate (free stock) to avoid cost.",
        },
        { status: 500 },
      );
    }

    const imageMeta = await persistFeaturedImage(slug, existing, result.meta);
    revalidateBlogImagePaths(slug);

    return NextResponse.json({
      ok: true,
      featuredImageUrl: result.meta.imageUrl,
      ogImageUrl: result.meta.ogImageUrl,
      featuredImageAlt: result.meta.imageAlt,
      imageMeta,
      title,
      attempts: result.attempts,
      blockedPublish: result.blockedPublish,
      visualCategory: result.meta.visualCategory,
      relevanceScore: result.meta.relevanceScore,
      uniquenessScore: result.meta.uniquenessScore,
      source: "openai",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Image generation failed";
    console.error("[blog-image-generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
