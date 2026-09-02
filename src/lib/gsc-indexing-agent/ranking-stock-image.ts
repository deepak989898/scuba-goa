/**
 * Apply free-stock hero images after ranking content improve (automation path).
 */

import { revalidatePath } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  blogPostToFirestorePayload,
  parseBlogPostFromFirestore,
} from "@/lib/blog-firestore";
import { attachStockFeaturedImage } from "@/lib/blog-automation/stock-featured-image";
import { getAllServicesServer } from "@/lib/get-services-server";
import { fallbackServices } from "@/data/services";
import type { SeoUrlRecord } from "./types";
import { upsertSeoUrl } from "./store";

export async function applyStockImageForRankingBlog(
  record: SeoUrlRecord,
  title: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (record.pageType !== "blog") {
    return { ok: true };
  }

  const slug = record.contentId.trim();
  const db = getAdminDb();
  if (!db) return { ok: false, reason: "Server not configured" };

  const snap = await db.collection("blogPosts").doc(slug).get();
  if (!snap.exists) return { ok: false, reason: "Blog not found" };

  const current = parseBlogPostFromFirestore(
    slug,
    snap.data() as Record<string, unknown>,
    { requirePublished: false },
  );
  if (!current) return { ok: false, reason: "Could not parse blog" };

  const hasImage = Boolean(current.featuredImageUrl?.trim());
  const existingRelevance = current.imageMeta?.relevanceScore;
  const lowExisting =
    typeof existingRelevance === "number" && existingRelevance < 0.45;

  if (hasImage && !lowExisting) {
    return { ok: true };
  }

  const services = await getAllServicesServer();
  const serviceSlug = String(current.serviceSlug ?? "").trim();
  const serviceName =
    services.find((s) => s.slug === serviceSlug)?.title ??
    fallbackServices.find((s) => s.slug === serviceSlug)?.title ??
    (serviceSlug || "Goa");

  const stock = await attachStockFeaturedImage({
    articleId: slug,
    slug,
    title: title || current.title,
    primaryKeyword: current.keywords?.[0] || title || current.title,
    serviceSlug,
    serviceName,
    brandingEnabled: false,
  });

  if (!stock.ok || !stock.meta?.imageUrl) {
    return {
      ok: false,
      reason: stock.error || "Free stock image not found",
    };
  }

  const meta = stock.meta;
  const now = new Date().toISOString();
  const next = {
    ...current,
    featuredImageUrl: meta.imageUrl,
    ogImageUrl: meta.ogImageUrl || meta.imageUrl,
    featuredImageAlt: meta.imageAlt || current.featuredImageAlt,
    imageMeta: {
      visualCategory: meta.visualCategory,
      compositionSignature: meta.compositionSignature,
      generatedPrompt: meta.generatedPrompt,
      generationModel: meta.generationModel,
      sha256: meta.sha256,
      perceptualHash: meta.perceptualHash,
      differenceHash: meta.differenceHash,
      promptHash: meta.promptHash,
      relevanceScore: meta.relevanceScore,
      uniquenessScore: meta.uniquenessScore,
      source: meta.source,
      imageTitle: meta.imageTitle,
      imageCaption: meta.imageCaption,
      width: meta.width,
      height: meta.height,
      mimeType: meta.mimeType,
      fileSize: meta.fileSize,
      qualityScore: meta.qualityScore,
      safetyScore: meta.safetyScore,
      overallImageScore: meta.overallImageScore,
      imageStatus: meta.imageStatus,
    },
    updatedAt: now,
  };

  await db
    .collection("blogPosts")
    .doc(slug)
    .set(blogPostToFirestorePayload(next), { merge: true });

  revalidatePath(`/blog/${slug}`, "page");
  revalidatePath("/blog", "page");

  const lowRelevance =
    typeof meta.relevanceScore === "number" && meta.relevanceScore < 0.45;
  if (lowRelevance) {
    await upsertSeoUrl({
      ...record,
      imageAttention: {
        needsOpenAi: true,
        reason: `Stock image relevance low (${meta.relevanceScore?.toFixed(2)}). Consider OpenAI hero for better SERP match.`,
        at: now,
      },
      updatedAt: now,
    });
    return {
      ok: false,
      reason: `Stock attached but low relevance (${meta.relevanceScore?.toFixed(2)}) — needs OpenAI review`,
    };
  }

  await upsertSeoUrl({
    ...record,
    imageAttention: undefined,
    updatedAt: now,
  });

  return { ok: true };
}
