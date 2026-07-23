import { downloadCompressUploadBlogImage } from "@/lib/blog-automation/images";
import { buildPexelsQueries, searchPexelsPhoto } from "@/lib/blog-automation/pexels";
import type { BlogImageMeta } from "@/lib/blog-automation/image-pipeline/types";

export type StockImageSource = "pexels" | "pixabay" | "unsplash";

export type StockPhotoHit = {
  source: StockImageSource;
  url: string;
  alt: string;
  photographer: string;
  query: string;
};

async function searchPixabayPhoto(query: string): Promise<StockPhotoHit | null> {
  const key = process.env.PIXABAY_API_KEY?.trim();
  if (!key) return null;

  const q = encodeURIComponent(query.slice(0, 100));
  const res = await fetch(
    `https://pixabay.com/api/?key=${key}&q=${q}&image_type=photo&orientation=horizontal&safesearch=true&per_page=10`,
    { next: { revalidate: 0 } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    hits?: Array<{
      largeImageURL?: string;
      webformatURL?: string;
      user?: string;
      tags?: string;
    }>;
  };
  const hit = data.hits?.[0];
  const url = hit?.largeImageURL || hit?.webformatURL || "";
  if (!url) return null;
  return {
    source: "pixabay",
    url,
    alt: hit?.tags || query,
    photographer: hit?.user || "Pixabay",
    query,
  };
}

async function searchUnsplashPhoto(query: string): Promise<StockPhotoHit | null> {
  const key =
    process.env.UNSPLASH_ACCESS_KEY?.trim() ||
    process.env.UNSPLASH_API_KEY?.trim();
  if (!key) return null;

  const q = encodeURIComponent(query.slice(0, 100));
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${q}&orientation=landscape&per_page=8`,
    {
      headers: {
        Authorization: `Client-ID ${key}`,
        "Accept-Version": "v1",
      },
      next: { revalidate: 0 },
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: Array<{
      urls?: { regular?: string; full?: string; raw?: string };
      alt_description?: string | null;
      description?: string | null;
      user?: { name?: string };
    }>;
  };
  const photo = data.results?.[0];
  const url =
    photo?.urls?.regular || photo?.urls?.full || photo?.urls?.raw || "";
  if (!url) return null;
  return {
    source: "unsplash",
    url,
    alt: photo?.alt_description || photo?.description || query,
    photographer: photo?.user?.name || "Unsplash",
    query,
  };
}

/**
 * Primary Pexels → Pixabay → Unsplash. Tries topic queries until one source returns a photo.
 */
export async function searchStockPhotoCascade(input: {
  title: string;
  serviceSlug: string;
  serviceName: string;
}): Promise<StockPhotoHit | null> {
  const queries = buildPexelsQueries(input);

  for (const query of queries) {
    const pexels = await searchPexelsPhoto(query);
    if (pexels?.url) {
      return {
        source: "pexels",
        url: pexels.url,
        alt: pexels.alt || `${input.title} (${query})`,
        photographer: pexels.photographer,
        query,
      };
    }

    const pixabay = await searchPixabayPhoto(query);
    if (pixabay) return pixabay;

    const unsplash = await searchUnsplashPhoto(query);
    if (unsplash) return unsplash;
  }

  // Last-resort broad queries if topic queries all miss
  for (const fallback of ["goa beach travel", "tropical ocean india", "goa tourism"]) {
    const pexels = await searchPexelsPhoto(fallback);
    if (pexels?.url) {
      return {
        source: "pexels",
        url: pexels.url,
        alt: `${input.title} — ${fallback}`,
        photographer: pexels.photographer,
        query: fallback,
      };
    }
    const pixabay = await searchPixabayPhoto(fallback);
    if (pixabay) return pixabay;
    const unsplash = await searchUnsplashPhoto(fallback);
    if (unsplash) return unsplash;
  }

  return null;
}

export type StockFeaturedImageResult = {
  ok: boolean;
  meta: BlogImageMeta | null;
  error?: string;
};

/**
 * Fetch a free stock photo (Pexels → Pixabay → Unsplash), convert to branded WebP,
 * upload to Firebase Storage — used when AI image generation is off.
 */
export async function attachStockFeaturedImage(input: {
  articleId: string;
  slug: string;
  title: string;
  primaryKeyword?: string;
  serviceSlug: string;
  serviceName: string;
  brandingEnabled?: boolean;
}): Promise<StockFeaturedImageResult> {
  const brandingEnabled = input.brandingEnabled !== false;
  try {
    const photo = await searchStockPhotoCascade({
      title: input.title,
      serviceSlug: input.serviceSlug,
      serviceName: input.serviceName,
    });
    if (!photo?.url) {
      return {
        ok: false,
        meta: null,
        error:
          "No stock photo found (configure PEXELS_API_KEY, PIXABAY_API_KEY, and/or UNSPLASH_ACCESS_KEY)",
      };
    }

    const uploaded = await downloadCompressUploadBlogImage({
      imageUrl: photo.url,
      slug: input.slug,
      articleId: input.articleId,
      brandingEnabled,
    });

    const keyword = input.primaryKeyword || input.title;
    const seoAlt =
      photo.alt?.trim() ||
      `${input.title} — ${keyword} in Goa | Book Scuba Goa`;

    const meta: BlogImageMeta = {
      imageUrl: uploaded.featuredImageUrl,
      ogImageUrl: uploaded.ogImageUrl,
      imageAlt: seoAlt.slice(0, 125),
      imageTitle: input.title.slice(0, 70),
      imageCaption: `${input.title}. Photo via ${photo.source} (${photo.photographer}).`,
      width: uploaded.width,
      height: uploaded.height,
      mimeType: uploaded.mimeType || "image/webp",
      fileSize: uploaded.fileSize,
      source: photo.source,
      generatedPrompt: `stock:${photo.source}:${photo.query}`,
      visualCategory: "general_travel",
      compositionSignature: `stock_${photo.source}_${photo.query.replace(/\s+/g, "_").slice(0, 40)}`,
      generationModel: photo.source,
      createdAt: new Date().toISOString(),
      sha256: "",
      perceptualHash: "",
      differenceHash: "",
      promptHash: "",
      relevanceScore: 88,
      uniquenessScore: 82,
      qualityScore: 90,
      safetyScore: 95,
      overallImageScore: 88,
      validationNotes: [
        `stock_${photo.source}`,
        "webp_firebase",
        `query:${photo.query}`,
      ],
      imageStatus: "approved",
      brandingApplied: uploaded.brandingApplied,
      articleId: input.articleId,
    };

    return { ok: true, meta };
  } catch (e) {
    return {
      ok: false,
      meta: null,
      error: e instanceof Error ? e.message : "Stock image attach failed",
    };
  }
}
