/**
 * Resolve Wikimedia Commons file titles to downloadable image URLs via API.
 * Hardcoded thumb paths break often — always resolve through the API.
 */

const USER_AGENT = "BookScubaGoa-BlogBot/1.0 (blog images; +https://www.bookscubagoa.com)";

function cleanWikimediaUrl(url: string): string {
  return url.split("?")[0] || url;
}

type ImageInfo = {
  url?: string;
  thumburl?: string;
};

/**
 * Resolve one or more File: titles to landscape-friendly download URLs.
 */
export async function resolveWikimediaFileUrls(
  fileTitles: string[],
  width = 1600,
): Promise<Array<{ title: string; url: string }>> {
  const titles = fileTitles
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("File:") ? t : `File:${t}`));

  if (!titles.length) return [];

  const params = new URLSearchParams({
    action: "query",
    titles: titles.join("|"),
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: String(width),
    format: "json",
    origin: "*",
  });

  try {
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?${params.toString()}`,
      {
        headers: { "User-Agent": USER_AGENT },
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return [];

    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            title?: string;
            missing?: string;
            imageinfo?: ImageInfo[];
          }
        >;
      };
    };

    const out: Array<{ title: string; url: string }> = [];
    for (const page of Object.values(data.query?.pages ?? {})) {
      if (page.missing) continue;
      const info = page.imageinfo?.[0];
      const raw =
        info?.url || info?.thumburl || "";
      const url = cleanWikimediaUrl(raw);
      if (!url || !/^https?:\/\//i.test(url)) continue;
      const title = (page.title || "").replace(/^File:/i, "");
      out.push({ title, url });
    }
    return out;
  } catch {
    return [];
  }
}

export async function resolveWikimediaFileUrl(
  fileTitle: string,
  width = 1600,
): Promise<string | null> {
  const hits = await resolveWikimediaFileUrls([fileTitle], width);
  return hits[0]?.url ?? null;
}
