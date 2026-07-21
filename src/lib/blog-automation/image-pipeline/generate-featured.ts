import { brandAndUploadBlogImageBuffer, downloadCompressUploadBlogImage } from "@/lib/blog-automation/images";
import { generateBlogImageBufferFromBrief } from "@/lib/blog-automation/openai-image";
import { searchPexelsPhotoForPost } from "@/lib/blog-automation/pexels";
import {
  buildImageAltFromBrief,
  buildImageCaptionFromBrief,
  buildImagePromptFromBrief,
  buildImageTitleFromBrief,
} from "./build-prompt";
import { classifyVisualCategory } from "./classify-visual";
import { buildImageBrief } from "./composition-engine";
import {
  checkImageDuplicate,
  listRecentImageRegistry,
  saveImageRegistryEntry,
} from "./dedupe";
import {
  averageHash,
  differenceHash,
  promptHash,
  sha256Hex,
} from "./hash";
import type {
  BlogImageMeta,
  GenerateFeaturedImageInput,
  GenerateFeaturedImageResult,
} from "./types";
import { validateImageBriefRelevance } from "./validate";

async function hashesFor(buffer: Buffer) {
  const [perceptualHash, differenceHashValue] = await Promise.all([
    averageHash(buffer),
    differenceHash(buffer),
  ]);
  return {
    sha256: sha256Hex(buffer),
    perceptualHash,
    differenceHash: differenceHashValue,
  };
}

/**
 * Full featured-image pipeline: classify → brief → prompt → generate →
 * hash/dedupe → validate → upload (unique path) → registry.
 */
export async function generateFeaturedImageForArticle(
  input: GenerateFeaturedImageInput,
): Promise<GenerateFeaturedImageResult> {
  const maxRetries = Math.max(1, Math.min(3, input.maxRetries ?? 3));
  const minRelevance = input.minRelevanceScore ?? 90;
  const minUniqueness = input.minUniquenessScore ?? 85;
  const minOverall = input.minOverallScore ?? 88;
  const brandingEnabled = input.brandingEnabled !== false;
  const allowPexels = input.allowPexelsFallback === true;

  const classification = classifyVisualCategory({
    title: input.title,
    primaryKeyword: input.primaryKeyword,
    serviceSlug: input.serviceSlug,
    serviceName: input.serviceName,
    contentExcerpt: input.contentExcerpt,
  });

  const registry = await listRecentImageRegistry(250);
  let lastError = "";
  let attempts = 0;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    attempts = attempt;
    const brief = buildImageBrief({
      articleTitle: input.title,
      primaryKeyword: input.primaryKeyword || input.title,
      serviceName: input.serviceName || "Goa adventures",
      serviceSlug: input.serviceSlug || "",
      classification,
      attempt,
    });

    const briefValidation = validateImageBriefRelevance(brief, {
      minRelevance,
      minOverall,
    });
    if (!briefValidation.passed && attempt === 1) {
      // Still try generation but keep notes; hard-fail only after retries if still bad
    }

    try {
      const { buffer: raw, model, prompt } = await generateBlogImageBufferFromBrief(
        brief,
      );
      const preHashes = await hashesFor(raw);
      const pHash = promptHash(prompt);

      const dup = checkImageDuplicate({
        articleId: input.articleId,
        sha256: preHashes.sha256,
        perceptualHash: preHashes.perceptualHash,
        differenceHash: preHashes.differenceHash,
        promptHash: pHash,
        compositionSignature: brief.uniquenessSignature,
        visualCategory: brief.visualCategory,
        registry,
      });

      if (dup.isDuplicate || dup.uniquenessScore < minUniqueness) {
        lastError = dup.reason || `uniqueness_${dup.uniquenessScore}`;
        continue;
      }

      const uploaded = await brandAndUploadBlogImageBuffer(raw, input.slug, {
        articleId: input.articleId,
        brandingEnabled,
      });

      const uniquenessScore = Math.max(dup.uniquenessScore, minUniqueness);
      const overall = Math.round(
        briefValidation.relevanceScore * 0.5 +
          briefValidation.qualityScore * 0.2 +
          briefValidation.safetyScore * 0.15 +
          uniquenessScore * 0.15,
      );

      const status =
        briefValidation.relevanceScore >= minRelevance &&
        uniquenessScore >= minUniqueness &&
        overall >= minOverall
          ? "generated"
          : "needs_manual_review";

      const meta: BlogImageMeta = {
        imageUrl: uploaded.featuredImageUrl,
        ogImageUrl: uploaded.ogImageUrl,
        imageAlt: buildImageAltFromBrief(brief),
        imageTitle: buildImageTitleFromBrief(brief),
        imageCaption: buildImageCaptionFromBrief(brief),
        width: uploaded.width,
        height: uploaded.height,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.fileSize,
        source: "openai",
        generatedPrompt: prompt,
        visualCategory: brief.visualCategory,
        compositionSignature: brief.uniquenessSignature,
        generationModel: model,
        createdAt: new Date().toISOString(),
        sha256: preHashes.sha256,
        perceptualHash: preHashes.perceptualHash,
        differenceHash: preHashes.differenceHash,
        promptHash: pHash,
        relevanceScore: briefValidation.relevanceScore,
        uniquenessScore,
        qualityScore: briefValidation.qualityScore,
        safetyScore: briefValidation.safetyScore,
        overallImageScore: overall,
        validationNotes: [
          ...briefValidation.validationNotes,
          ...(dup.reason ? [`dedupe_near:${dup.reason}`] : []),
          `attempt_${attempt}`,
        ],
        imageStatus: status,
        brandingApplied: uploaded.brandingApplied,
        articleId: input.articleId,
      };

      await saveImageRegistryEntry({
        articleId: input.articleId,
        slug: input.slug,
        imageUrl: meta.imageUrl,
        sha256: meta.sha256,
        perceptualHash: meta.perceptualHash,
        differenceHash: meta.differenceHash,
        promptHash: meta.promptHash,
        visualCategory: meta.visualCategory,
        compositionSignature: meta.compositionSignature,
        model: meta.generationModel,
        width: meta.width,
        height: meta.height,
        createdAt: meta.createdAt,
      });

      const blockedPublish = status === "needs_manual_review";
      return { ok: true, meta, attempts, blockedPublish };
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Image generation failed";
    }
  }

  // Optional Pexels fallback — topic-aware queries already in pexels.ts
  if (allowPexels) {
    try {
      const photo = await searchPexelsPhotoForPost({
        title: input.title,
        serviceSlug: input.serviceSlug || "",
        serviceName: input.serviceName || "",
      });
      if (photo?.url) {
        const uploaded = await downloadCompressUploadBlogImage({
          imageUrl: photo.url,
          slug: input.slug,
          articleId: input.articleId,
          brandingEnabled,
        });
        const brief = buildImageBrief({
          articleTitle: input.title,
          primaryKeyword: input.primaryKeyword || input.title,
          serviceName: input.serviceName || "Goa adventures",
          serviceSlug: input.serviceSlug || "",
          classification,
          attempt: maxRetries + 1,
        });
        const meta: BlogImageMeta = {
          imageUrl: uploaded.featuredImageUrl,
          ogImageUrl: uploaded.ogImageUrl,
          imageAlt:
            photo.alt?.trim() || buildImageAltFromBrief(brief),
          imageTitle: buildImageTitleFromBrief(brief),
          imageCaption: buildImageCaptionFromBrief(brief),
          width: uploaded.width,
          height: uploaded.height,
          mimeType: uploaded.mimeType,
          fileSize: uploaded.fileSize,
          source: "pexels",
          generatedPrompt: buildImagePromptFromBrief(brief),
          visualCategory: brief.visualCategory,
          compositionSignature: brief.uniquenessSignature,
          generationModel: "pexels",
          createdAt: new Date().toISOString(),
          sha256: "",
          perceptualHash: "",
          differenceHash: "",
          promptHash: promptHash(buildImagePromptFromBrief(brief)),
          relevanceScore: 70,
          uniquenessScore: 60,
          qualityScore: 70,
          safetyScore: 80,
          overallImageScore: 68,
          validationNotes: [
            "pexels_fallback",
            "needs_manual_review_for_auto_publish",
            lastError ? `openai_failed:${lastError}` : "",
          ].filter(Boolean),
          imageStatus: "needs_manual_review",
          brandingApplied: uploaded.brandingApplied,
          articleId: input.articleId,
        };
        return { ok: true, meta, attempts, blockedPublish: true };
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : lastError;
    }
  }

  return {
    ok: false,
    meta: null,
    error: lastError || "Image generation failed after retries",
    attempts,
    blockedPublish: true,
  };
}

export {
  classifyVisualCategory,
  buildImageBrief,
  buildImagePromptFromBrief,
  checkImageDuplicate,
};
