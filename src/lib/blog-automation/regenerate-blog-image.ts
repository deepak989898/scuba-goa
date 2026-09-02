import { revalidatePath } from "next/cache";
import { attachStockFeaturedImage } from "@/lib/blog-automation/stock-featured-image";
import { generateFeaturedImageForArticle } from "@/lib/blog-automation/image-pipeline";
import { getAdminDb } from "@/lib/firebase-admin";
import { stripUndefinedDeep } from "@/lib/firestore-json";
import {
  parseBlogPostFromFirestore,
  type BlogPostFirestore,
} from "@/lib/blog-firestore";
import { syncBlogImageToHomeGallery } from "@/lib/home-gallery-sync";
import { pickBlogFeaturedImage } from "@/lib/cms-image";
import { resolveImageServiceContext } from "@/lib/blog-automation/resolve-image-service";

export function blogPostNeedsImageRegenerate(post: BlogPostFirestore): boolean {
  const url = pickBlogFeaturedImage(post.featuredImageUrl, post.ogImageUrl);
  return !url;
}

export async function regenerateBlogPostFeaturedImage(
  slug: string,
  opts?: {
    title?: string;
    useStock?: boolean;
    allowPexelsFallback?: boolean;
  },
): Promise<{
  ok: boolean;
  slug: string;
  featuredImageUrl?: string;
  ogImageUrl?: string;
  featuredImageAlt?: string;
  source?: string;
  error?: string;
}> {
  const db = getAdminDb();
  if (!db) return { ok: false, slug, error: "Database not configured" };

  const ref = db.collection("blogPosts").doc(slug);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, slug, error: "Blog post not found" };

  const existing = snap.data() as Record<string, unknown>;
  const title =
    String(opts?.title ?? "").trim() || String(existing.title ?? "").trim();
  if (!title) return { ok: false, slug, error: "Blog title required" };

  const storedSlug = String(existing.serviceSlug ?? "");
  const { serviceSlug, serviceName } = await resolveImageServiceContext(
    title,
    storedSlug,
  );
  const useStock = opts?.useStock === true;

  let imageUrl = "";
  let ogUrl = "";
  let imageAlt = "";
  let imageMeta: Record<string, unknown> | null = null;
  let source = "";

  if (useStock) {
    const stock = await attachStockFeaturedImage({
      articleId: slug,
      slug,
      title,
      primaryKeyword: Array.isArray(existing.keywords)
        ? String(existing.keywords[0] || title)
        : title,
      serviceSlug,
      serviceName,
      brandingEnabled: false,
    });
    if (!stock.meta?.imageUrl) {
      return {
        ok: false,
        slug,
        error: stock.error || "Stock image attach failed",
      };
    }
    imageUrl = stock.meta.imageUrl;
    ogUrl = stock.meta.ogImageUrl;
    imageAlt = stock.meta.imageAlt;
    imageMeta = stock.meta as unknown as Record<string, unknown>;
    source = String(stock.meta.generationModel || "stock");
  } else {
    const result = await generateFeaturedImageForArticle({
      articleId: slug,
      slug,
      title,
      primaryKeyword: Array.isArray(existing.keywords)
        ? String(existing.keywords[0] || title)
        : title,
      serviceSlug,
      serviceName,
      contentExcerpt: String(existing.content ?? "").slice(0, 600),
      brandingEnabled: true,
      allowPexelsFallback: opts?.allowPexelsFallback === true,
      maxRetries: 3,
    });
    if (!result.meta) {
      return {
        ok: false,
        slug,
        error: result.error || "AI image generation failed",
      };
    }
    imageUrl = result.meta.imageUrl;
    ogUrl = result.meta.ogImageUrl;
    imageAlt = result.meta.imageAlt;
    imageMeta = result.meta as unknown as Record<string, unknown>;
    source = String(result.meta.generationModel || "openai");
  }

  const now = new Date().toISOString();
  const previousUrl = String(existing.featuredImageUrl ?? "").trim();
  const previousMeta =
    existing.imageMeta && typeof existing.imageMeta === "object"
      ? (existing.imageMeta as Record<string, unknown>)
      : null;
  const history = Array.isArray(previousMeta?.history)
    ? [...(previousMeta.history as unknown[])]
    : [];
  if (previousUrl) {
    history.unshift({
      imageUrl: previousUrl,
      createdAt: String(previousMeta?.createdAt || existing.updatedAt || now),
      reason: "replaced_by_regenerate",
    });
  }

  const mergedMeta = {
    ...(imageMeta ?? {}),
    history: history.slice(0, 10),
  };

  await ref.set(
    stripUndefinedDeep({
      featuredImageUrl: imageUrl,
      ogImageUrl: ogUrl,
      featuredImageAlt: imageAlt,
      imageMeta: mergedMeta,
      updatedAt: now,
    }),
    { merge: true },
  );

  const post = parseBlogPostFromFirestore(
    slug,
    {
      ...existing,
      featuredImageUrl: imageUrl,
      ogImageUrl: ogUrl,
      featuredImageAlt: imageAlt,
      imageMeta: mergedMeta,
    },
    { requirePublished: false },
  );

  if (post?.published && imageUrl) {
    try {
      await syncBlogImageToHomeGallery({
        blogSlug: slug,
        title: post.title,
        featuredImageUrl: imageUrl,
        serviceSlug: post.serviceSlug,
        published: true,
      });
    } catch {
      /* gallery sync optional */
    }
  }

  revalidatePath(`/blog/${slug}`);
  revalidatePath("/blog");

  return {
    ok: true,
    slug,
    featuredImageUrl: imageUrl,
    ogImageUrl: ogUrl,
    featuredImageAlt: imageAlt,
    source,
  };
}
