import { downloadCompressUploadBlogImage } from "@/lib/blog-automation/images";
import {
  inferBlogImageTopic,
  listCuratedFileTitlesForTopic,
  stockImageSearchQueries,
  blogImageVarietySeed,
} from "@/lib/blog-automation/blog-image-topic";
import { searchPexelsPhoto } from "@/lib/blog-automation/pexels";
import { searchOpenversePhoto } from "@/lib/blog-automation/openverse";
import {
  searchWikimediaCommonsPhoto,
  searchWikimediaCommonsPhotos,
} from "@/lib/blog-automation/wikimedia-commons";
import { resolveWikimediaFileUrls } from "@/lib/blog-automation/wikimedia-file-url";
import type { BlogImageMeta, VisualCategory } from "@/lib/blog-automation/image-pipeline/types";
import type { BlogImageTopic } from "@/lib/blog-automation/blog-image-topic";

export type StockImageSource =
  | "pexels"
  | "pixabay"
  | "unsplash"
  | "wikimedia"
  | "openverse"
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

function dedupeHits(hits: StockPhotoHit[]): StockPhotoHit[] {
  const seen = new Set<string>();
  const out: StockPhotoHit[] = [];
  for (const h of hits) {
    const key = h.url.split("?")[0].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}

async function hitsFromCuratedFiles(
  title: string,
  serviceSlug: string,
): Promise<StockPhotoHit[]> {
  const fileTitles = listCuratedFileTitlesForTopic(title, serviceSlug);
  const resolved = await resolveWikimediaFileUrls(fileTitles);
  return resolved.map((r) => ({
    source: "curated_fallback" as const,
    url: r.url,
    alt: r.title || title,
    photographer: "Wikimedia Commons (curated)",
    query: r.title,
  }));
}

/**
 * Collect candidates from every free source — APIs, Openverse, Wikimedia search, curated files.
 */
export async function collectStockPhotoCandidates(input: {
  title: string;
  serviceSlug: string;
  serviceName: string;
  varietySeed?: string;
}): Promise<StockPhotoHit[]> {
  const seed = input.varietySeed || input.title;
  const topic = inferBlogImageTopic(input.title, input.serviceSlug);
  const candidates: StockPhotoHit[] = [];

  const queries = stockImageSearchQueries(input);

  for (const query of queries) {
    const pexels = await searchPexelsPhoto(query, seed);
    if (pexels?.url) {
      candidates.push({
        source: "pexels",
        url: pexels.url,
        alt: pexels.alt || `${input.title} (${query})`,
        photographer: pexels.photographer,
        query,
      });
    }

    const pixabay = await searchPixabayPhoto(query, seed);
    if (pixabay) candidates.push(pixabay);

    const unsplash = await searchUnsplashPhoto(query, seed);
    if (unsplash) candidates.push(unsplash);

    const openverse = await searchOpenversePhoto(query, seed);
    if (openverse) {
      candidates.push({
        source: "openverse",
        url: openverse.url,
        alt: openverse.alt,
        photographer: openverse.photographer,
        query: openverse.query,
      });
    }

    const wikiHits = await searchWikimediaCommonsPhotos(query, seed, 4);
    for (const wiki of wikiHits) {
      candidates.push({
        source: "wikimedia",
        url: wiki.url,
        alt: wiki.alt,
        photographer: wiki.photographer,
        query: wiki.query,
      });
    }
  }

  const broadQueries = [
    `${topic.replace(/_/g, " ")} goa india`,
    "goa beach travel",
    "tropical ocean india",
    "goa tourism landscape",
    "india travel beach sunset",
  ];

  for (const fallback of broadQueries) {
    const openverse = await searchOpenversePhoto(fallback, `${seed}:${fallback}`);
    if (openverse) {
      candidates.push({
        source: "openverse",
        url: openverse.url,
        alt: openverse.alt,
        photographer: openverse.photographer,
        query: openverse.query,
      });
    }

    const wikiHits = await searchWikimediaCommonsPhotos(fallback, seed, 3);
    for (const wiki of wikiHits) {
      candidates.push({
        source: "wikimedia",
        url: wiki.url,
        alt: wiki.alt,
        photographer: wiki.photographer,
        query: wiki.query,
      });
    }

    const pexels = await searchPexelsPhoto(fallback, `${seed}:${fallback}`);
    if (pexels?.url) {
      candidates.push({
        source: "pexels",
        url: pexels.url,
        alt: `${input.title} — ${fallback}`,
        photographer: pexels.photographer,
        query: fallback,
      });
    }
    const pixabay = await searchPixabayPhoto(fallback, seed);
    if (pixabay) candidates.push(pixabay);
    const unsplash = await searchUnsplashPhoto(fallback, seed);
    if (unsplash) candidates.push(unsplash);
  }

  const curated = await hitsFromCuratedFiles(input.title, input.serviceSlug);
  candidates.push(...curated);

  return dedupeHits(candidates);
}

/** First hit from the candidate pool (legacy helper). */
export async function searchStockPhotoCascade(input: {
  title: string;
  serviceSlug: string;
  serviceName: string;
  varietySeed?: string;
}): Promise<StockPhotoHit | null> {
  const hits = await collectStockPhotoCandidates(input);
  return hits[0] ?? null;
}

export type StockFeaturedImageResult = {
  ok: boolean;
  meta: BlogImageMeta | null;
  error?: string;
  attempted?: number;
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

  const sourceMap: Record<StockImageSource, BlogImageMeta["source"]> = {
    pexels: "pexels",
    pixabay: "pexels",
    unsplash: "pexels",
    wikimedia: "pexels",
    openverse: "pexels",
    curated_fallback: "pexels",
  };

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
    source: sourceMap[photo.source],
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
 * Tries Pexels → Pixabay → Unsplash → Openverse → Wikimedia search → curated Commons files.
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
  const topic = inferBlogImageTopic(input.title, input.serviceSlug);

  try {
    const candidates = await collectStockPhotoCandidates({
      title: input.title,
      serviceSlug: input.serviceSlug,
      serviceName: input.serviceName,
      varietySeed,
    });

    for (const photo of candidates) {
      const uploaded = await tryUploadStockUrl(photo, {
        ...input,
        brandingEnabled,
      });
      if (uploaded?.meta) {
        return { ok: true, meta: uploaded.meta, attempted: candidates.length };
      }
    }

    // Absolute last resort: single Wikimedia search + direct URL (no Firebase upload)
    const wiki = await searchWikimediaCommonsPhoto(
      `${input.title} goa india`,
      varietySeed,
    );
    if (wiki?.url) {
      const keyword = input.primaryKeyword || input.title;
      return {
        ok: true,
        attempted: candidates.length,
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

    const hasApiKeys =
      process.env.PEXELS_API_KEY?.trim() ||
      process.env.PIXABAY_API_KEY?.trim() ||
      process.env.UNSPLASH_ACCESS_KEY?.trim() ||
      process.env.UNSPLASH_API_KEY?.trim();

    return {
      ok: false,
      meta: null,
      attempted: candidates.length,
      error: hasApiKeys
        ? `No stock photo could be downloaded after ${candidates.length} attempts. Try OpenAI image or upload manually.`
        : `No stock photo found after ${candidates.length} attempts (Openverse + Wikimedia). Add PEXELS_API_KEY / PIXABAY_API_KEY / UNSPLASH_ACCESS_KEY on Vercel for more variety.`,
    };
  } catch (e) {
    return {
      ok: false,
      meta: null,
      error: e instanceof Error ? e.message : "Stock image attach failed",
    };
  }
}
