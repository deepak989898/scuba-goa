import { blogImageVarietySeed } from "@/lib/blog-automation/blog-image-topic";

export type WikimediaPhoto = {
  url: string;
  alt: string;
  photographer: string;
  query: string;
};

/**
 * Search Wikimedia Commons (free, no API key). Returns a landscape photo URL.
 */
export async function searchWikimediaCommonsPhoto(
  query: string,
  seed = "",
): Promise<WikimediaPhoto | null> {
  const q = query.trim().slice(0, 120);
  if (!q) return null;

  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: q,
    gsrnamespace: "6",
    gsrlimit: "15",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "1600",
    format: "json",
    origin: "*",
  });

  try {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
      headers: { "User-Agent": "BookScubaGoa-BlogBot/1.0 (blog images)" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            title?: string;
            imageinfo?: Array<{
              thumburl?: string;
              url?: string;
              descriptionurl?: string;
            }>;
          }
        >;
      };
    };

    const pages = Object.values(data.query?.pages ?? {});
    const hits: WikimediaPhoto[] = [];

    for (const page of pages) {
      const info = page.imageinfo?.[0];
      const url = info?.thumburl || info?.url || "";
      if (!url || !/^https?:\/\//i.test(url)) continue;
      const title = (page.title || q).replace(/^File:/i, "").replace(/_/g, " ");
      hits.push({
        url,
        alt: title,
        photographer: "Wikimedia Commons",
        query: q,
      });
    }

    if (!hits.length) return null;
    const idx = blogImageVarietySeed(`${seed}:${q}`) % hits.length;
    return hits[idx] ?? hits[0];
  } catch {
    return null;
  }
}
