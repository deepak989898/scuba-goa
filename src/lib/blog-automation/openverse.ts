import { blogImageVarietySeed } from "@/lib/blog-automation/blog-image-topic";

export type OpenversePhoto = {
  url: string;
  alt: string;
  photographer: string;
  query: string;
};

const OPENVERSE_TIMEOUT_MS = 10000;

/**
 * Openverse (Creative Commons search) — free, no API key required.
 * https://api.openverse.engineering/
 */
export async function searchOpenversePhoto(
  query: string,
  pickSeed = "",
): Promise<OpenversePhoto | null> {
  const q = query.trim().slice(0, 100);
  if (!q) return null;

  const params = new URLSearchParams({
    q,
    page_size: "20",
    license: "cc0,pdm,by,by-sa",
    license_type: "commercial,modification",
    mature: "false",
  });

  try {
    const res = await fetch(
      `https://api.openverse.engineering/v1/images/?${params.toString()}`,
      {
        headers: { "User-Agent": "BookScubaGoa-BlogBot/1.0" },
        signal: AbortSignal.timeout(OPENVERSE_TIMEOUT_MS),
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      results?: Array<{
        url?: string;
        title?: string;
        creator?: string;
        width?: number;
        height?: number;
        thumbnail?: string;
      }>;
    };

    const results = (data.results ?? []).filter((r) => {
      const url = r.url || r.thumbnail || "";
      if (!url || !/^https?:\/\//i.test(url)) return false;
      const w = Number(r.width) || 0;
      const h = Number(r.height) || 0;
      if (w > 0 && h > 0 && w < h) return false;
      return true;
    });

    if (!results.length) return null;

    const idx = blogImageVarietySeed(`${pickSeed}:${q}`) % results.length;
    const hit = results[idx] ?? results[0];
    const url = hit?.url || hit?.thumbnail || "";
    if (!url) return null;

    return {
      url,
      alt: hit?.title || q,
      photographer: hit?.creator || "Openverse",
      query: q,
    };
  } catch {
    return null;
  }
}
