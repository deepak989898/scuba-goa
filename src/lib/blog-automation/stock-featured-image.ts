import { downloadCompressUploadBlogImage } from "@/lib/blog-automation/images";
import {
  inferBlogImageTopic,
  pickCuratedBlogFallbackUrl,
  stockImageSearchQueries,
  blogImageVarietySeed,
} from "@/lib/blog-automation/blog-image-topic";
import { searchPexelsPhoto } from "@/lib/blog-automation/pexels";
import { searchWikimediaCommonsPhoto } from "@/lib/blog-automation/wikimedia-commons";
import type { BlogImageMeta, VisualCategory } from "@/lib/blog-automation/image-pipeline/types";
import type { BlogImageTopic } from "@/lib/blog-automation/blog-image-topic";

export type StockImageSource =
  | "pexels"
  | "pixabay"
  | "unsplash"
  | "wikimedia"
  | "curated_fallback";

export type StockPhotoHit = {
  source: StockImageSource;
  url: string;
  alt: string;
  photographer: string;
  query: string;
};

async function searchPixabayPhoto(
  query: string,
  pickSeed = "",
): Promise<StockPhotoHit | null> {
  const key = process.env.PIXABAY_API_KEY?.trim();
  if (!key) return null;

  const q = encodeURIComponent(query.slice(0, 100));
  const res = await fetch(
    `https://pixabay.com/api/?key=${key}&q=${q}&image_type=photo&orientation=horizontal&safesearch=true&per_page=15`,
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
  const hits = data.hits ?? [];
  if (!hits.length) return null;
  const idx = blogImageVarietySeed(`${pickSeed}:${query}`) % hits.length;
  const hit = hits[idx] ?? hits[0];
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

async function searchUnsplashPhoto(
  query: string,
  pickSeed = "",
): Promise<StockPhotoHit | null> {
  const key =
    process.env.UNSPLASH_ACCESS_KEY?.trim() ||
    process.env.UNSPLASH_API_KEY?.trim();
  if (!key) return null;

  const q = encodeURIComponent(query.slice(0, 100));
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${q}&orientation=landscape&per_page=15`,
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
  const results = data.results ?? [];
  if (!results.length) return null;
  const idx = blogImageVarietySeed(`${pickSeed}:${query}`) % results.length;
  const photo = results[idx] ?? results[0];
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
 * Pexels → Pixabay → Unsplash → Wikimedia Commons (no key).
 * Each source picks a different photo per slug/title (not always the first result).
 */
export async function searchStockPhotoCascade(input: {
  title: string;
  serviceSlug: string;
  serviceName: string;
  varietySeed?: string;
}): Promise<StockPhotoHit | null> {
  const seed = input.varietySeed || input.title;
  const topic = inferBlogImageTopic(input.title, input.serviceSlug);

  // Curated topic photos beat random Wikimedia search (avoids document scans).
  const curatedFirst = pickCuratedBlogFallbackUrl(
    input.title,
    input.serviceSlug,
    seed,
  );
  if (curatedFirst) {
    return {
      source: "curated_fallback",
      url: curatedFirst,
      alt: input.title,
      photographer: "Wikimedia Commons (curated)",
      query: topic,
    };
  }

  const queries = stockImageSearchQueries(input);

  for (const query of queries) {
    const pexels = await searchPexelsPhoto(query, seed);
    if (pexels?.url) {
      return {
        source: "pexels",
        url: pexels.url,
        alt: pexels.alt || `${input.title} (${query})`,
        photographer: pexels.photographer,
        query,
      };
    }

    const pixabay = await searchPixabayPhoto(query, seed);
    if (pixabay) return pixabay;

    const unsplash = await searchUnsplashPhoto(query, seed);
    if (unsplash) return unsplash;

    const wiki = await searchWikimediaCommonsPhoto(query, seed);
    if (wiki) {
      return {
        source: "wikimedia",
        url: wiki.url,
        alt: wiki.alt,
        photographer: wiki.photographer,
        query: wiki.query,
      };
    }
  }

  const broadQueries = [
    `${topic.replace(/_/g, " ")} goa india`,
    "goa beach travel",
    "tropical ocean india",
    "goa tourism landscape",
  ];

  for (const fallback of broadQueries) {
    const pexels = await searchPexelsPhoto(fallback, `${seed}:${fallback}`);
    if (pexels?.url) {
      return {
        source: "pexels",
        url: pexels.url,
        alt: `${input.title} — ${fallback}`,
        photographer: pexels.photographer,
        query: fallback,
      };
    }
    const pixabay = await searchPixabayPhoto(fallback, seed);
    if (pixabay) return pixabay;
    const unsplash = await searchUnsplashPhoto(fallback, seed);
    if (unsplash) return unsplash;
    const wiki = await searchWikimediaCommonsPhoto(fallback, seed);
    if (wiki) {
      return {
        source: "wikimedia",
        url: wiki.url,
        alt: wiki.alt,
        photographer: wiki.photographer,
        query: wiki.query,
      };
    }
  }

  const curatedUrl = pickCuratedBlogFallbackUrl(
    input.title,
    input.serviceSlug,
    seed,
  );
  if (curatedUrl) {
    return {
      source: "curated_fallback",
      url: curatedUrl,
      alt: input.title,
      photographer: "Wikimedia Commons (curated)",
      query: topic,
    };
  }

  return null;
}

export type StockFeaturedImageResult = {
  ok: boolean;
  meta: BlogImageMeta | null;
  error?: string;
};

function topicToVisualCategory(topic: BlogImageTopic): VisualCategory {
  const map: Record<BlogImageTopic, VisualCategory> = {
    casino: "nightlife",
    nightlife: "night_club",
    waterfall: "dudhsagar",
    north_goa: "north_goa",
    south_goa: "south_goa",
    dolphin: "island_guide",
    water_sports: "water_sports",
    scuba: "scuba_diving",
    island: "island_guide",
    trek: "general_travel",
    hotel: "beach_guide",
    food: "general_travel",
    beach: "beach_guide",
    general: "general_travel",
  };
  return map[topic] ?? "general_travel";
}

function buildStockMeta(
  photo: StockPhotoHit,
  input: {
    articleId: string;
    slug: string;
    title: string;
    primaryKeyword?: string;
    serviceSlug?: string;
  },
  uploaded: Awaited<ReturnType<typeof downloadCompressUploadBlogImage>>,
): BlogImageMeta {
  const keyword = input.primaryKeyword || input.title;
  const seoAlt =
    photo.alt?.trim() || `${input.title} — ${keyword} in Goa | Book Scuba Goa`;
  const topic = inferBlogImageTopic(input.title, input.serviceSlug || "");

  return {
    imageUrl: uploaded.featuredImageUrl,
    ogImageUrl: uploaded.ogImageUrl,
    imageAlt: seoAlt.slice(0, 125),
    imageTitle: input.title.slice(0, 70),
    imageCaption: `${input.title}. Photo via ${photo.source} (${photo.photographer}).`,
    width: uploaded.width,
    height: uploaded.height,
    mimeType: uploaded.mimeType || "image/webp",
    fileSize: uploaded.fileSize,
    source: photo.source === "wikimedia" || photo.source === "curated_fallback"
      ? "pexels"
      : photo.source,
    generatedPrompt: `stock:${photo.source}:${photo.query}`,
    visualCategory: topicToVisualCategory(topic),
    compositionSignature: `stock_${photo.source}_${photo.query.replace(/\s+/g, "_").slice(0, 40)}`,
    generationModel: photo.source,
    createdAt: new Date().toISOString(),
    sha256: "",
    perceptualHash: "",
    differenceHash: "",
    promptHash: "",
    relevanceScore: photo.source === "curated_fallback" ? 82 : 88,
    uniquenessScore: 85,
    qualityScore: 90,
    safetyScore: 95,
    overallImageScore: photo.source === "curated_fallback" ? 85 : 88,
    validationNotes: [
      `stock_${photo.source}`,
      "webp_firebase",
      `query:${photo.query}`,
    ],
    imageStatus: "approved",
    brandingApplied: uploaded.brandingApplied,
    articleId: input.articleId,
  };
}

async function tryUploadStockUrl(
  photo: StockPhotoHit,
  input: {
    articleId: string;
    slug: string;
    title: string;
    primaryKeyword?: string;
    brandingEnabled?: boolean;
  },
): Promise<StockFeaturedImageResult | null> {
  try {
    const uploaded = await downloadCompressUploadBlogImage({
      imageUrl: photo.url,
      slug: input.slug,
      articleId: input.articleId,
      brandingEnabled: input.brandingEnabled,
    });
    return {
      ok: true,
      meta: buildStockMeta(photo, input, uploaded),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch a free stock photo, convert to WebP on Firebase.
 * Falls back through APIs → Wikimedia → curated topic images.
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
  const varietySeed = `${input.slug}:${input.title}`;

  try {
    const photo = await searchStockPhotoCascade({
      title: input.title,
      serviceSlug: input.serviceSlug,
      serviceName: input.serviceName,
      varietySeed,
    });

    if (photo?.url) {
      const uploaded = await tryUploadStockUrl(photo, {
        ...input,
        brandingEnabled,
      });
      if (uploaded?.meta) return uploaded;
    }

    // Curated URLs — try each topic variant until download succeeds
    const topic = inferBlogImageTopic(input.title, input.serviceSlug);
    const curatedUrls = [
      pickCuratedBlogFallbackUrl(input.title, input.serviceSlug, varietySeed),
      pickCuratedBlogFallbackUrl(input.title, input.serviceSlug, `${varietySeed}:alt`),
      pickCuratedBlogFallbackUrl("goa beach", "beach", varietySeed),
    ].filter(Boolean) as string[];

    for (const url of curatedUrls) {
      const hit: StockPhotoHit = {
        source: "curated_fallback",
        url,
        alt: input.title,
        photographer: "Wikimedia Commons",
        query: topic,
      };
      const uploaded = await tryUploadStockUrl(hit, {
        ...input,
        brandingEnabled,
      });
      if (uploaded?.meta) return uploaded;
    }

    // Last resort: direct Wikimedia URL (no Firebase) so blog still has a real photo
    const wiki = await searchWikimediaCommonsPhoto(
      `${input.title} goa india`,
      varietySeed,
    );
    if (wiki?.url) {
      const keyword = input.primaryKeyword || input.title;
      return {
        ok: true,
        meta: {
          imageUrl: wiki.url,
          ogImageUrl: wiki.url,
          imageAlt: `${input.title} — ${keyword} in Goa`.slice(0, 125),
          imageTitle: input.title.slice(0, 70),
          imageCaption: `${input.title}. Photo: Wikimedia Commons.`,
          width: 1600,
          height: 900,
          mimeType: "image/jpeg",
          fileSize: 0,
          source: "pexels",
          generatedPrompt: `stock:wikimedia_direct:${wiki.query}`,
          visualCategory: topicToVisualCategory(topic),
          compositionSignature: `wikimedia_direct_${wiki.query}`,
          generationModel: "wikimedia",
          createdAt: new Date().toISOString(),
          sha256: "",
          perceptualHash: "",
          differenceHash: "",
          promptHash: "",
          relevanceScore: 80,
          uniquenessScore: 82,
          qualityScore: 85,
          safetyScore: 95,
          overallImageScore: 82,
          validationNotes: ["wikimedia_direct", `query:${wiki.query}`],
          imageStatus: "approved",
          brandingApplied: false,
          articleId: input.articleId,
        },
      };
    }

    return {
      ok: false,
      meta: null,
      error:
        "No stock photo found. Add PEXELS_API_KEY / PIXABAY_API_KEY / UNSPLASH_ACCESS_KEY on Vercel for best results.",
    };
  } catch (e) {
    return {
      ok: false,
      meta: null,
      error: e instanceof Error ? e.message : "Stock image attach failed",
    };
  }
}
