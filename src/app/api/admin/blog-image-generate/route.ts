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

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Generate a topic-specific featured image (classify → brief → OpenAI →
 * dedupe → unique Storage path) and update the blog post.
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

  const previousUrl = String(existing.featuredImageUrl ?? "").trim();
  const previousMeta =
    existing.imageMeta && typeof existing.imageMeta === "object"
      ? (existing.imageMeta as Record<string, unknown>)
      : null;

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
      allowPexelsFallback: body.allowPexelsFallback === true,
      maxRetries: 3,
    });

    if (!result.meta) {
      return NextResponse.json(
        {
          error:
            result.error ||
            "Image generation failed after uniqueness checks. Each OpenAI attempt is billed even if the image was rejected.",
          attempts: result.attempts,
          costNote:
            "OpenAI image API charges per successful generation call. Failed uniqueness retries still cost money.",
        },
        { status: 500 },
      );
    }

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
      ...result.meta,
      history: history.slice(0, 10),
    };

    await ref.set(
      stripUndefinedDeep({
        featuredImageUrl: result.meta.imageUrl,
        ogImageUrl: result.meta.ogImageUrl,
        featuredImageAlt: result.meta.imageAlt,
        imageMeta,
        updatedAt: now,
      }),
      { merge: true },
    );

    const post = parseBlogPostFromFirestore(
      slug,
      {
        ...existing,
        featuredImageUrl: result.meta.imageUrl,
        ogImageUrl: result.meta.ogImageUrl,
        featuredImageAlt: result.meta.imageAlt,
        imageMeta,
      },
      { requirePublished: false },
    );
    if (post?.published && result.meta.imageUrl) {
      try {
        await syncBlogImageToHomeGallery({
          blogSlug: slug,
          title: post.title,
          featuredImageUrl: result.meta.imageUrl,
          serviceSlug: post.serviceSlug,
          published: true,
        });
      } catch (e) {
        console.error("[blog-image-generate] gallery sync:", e);
      }
      revalidatePath(`/blog/${slug}`);
      revalidatePath("/blog");
    }

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
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Image generation failed";
    console.error("[blog-image-generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
