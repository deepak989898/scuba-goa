export type PexelsPhoto = {
  id: number;
  url: string;
  photographer: string;
  alt: string;
};

export async function searchPexelsPhoto(query: string): Promise<PexelsPhoto | null> {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key) return null;

  const q = encodeURIComponent(query.slice(0, 80));
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${q}&per_page=5&orientation=landscape`,
    {
      headers: { Authorization: key },
      next: { revalidate: 0 },
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    photos?: Array<{
      id: number;
      alt?: string;
      photographer?: string;
      src?: { large2x?: string; large?: string; original?: string };
    }>;
  };
  const photo = data.photos?.[0];
  if (!photo?.src) return null;
  const url =
    photo.src.large2x ?? photo.src.large ?? photo.src.original ?? "";
  if (!url) return null;
  return {
    id: photo.id,
    url,
    photographer: photo.photographer ?? "Pexels",
    alt: photo.alt ?? query,
  };
}

export function buildPexelsQuery(serviceName: string, title: string): string {
  const base = "scuba diving goa india";
  const lower = `${serviceName} ${title}`.toLowerCase();
  if (lower.includes("dudhsagar") || lower.includes("waterfall")) {
    return "dudhsagar waterfall goa";
  }
  if (lower.includes("north goa") || lower.includes("fort")) {
    return "north goa beach fort";
  }
  if (lower.includes("water sport") || lower.includes("parasail")) {
    return "water sports goa beach";
  }
  if (lower.includes("island") || lower.includes("grande")) {
    return "grande island goa boat";
  }
  return base;
}
