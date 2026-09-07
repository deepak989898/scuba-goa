import { unstable_cache } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import { sanitizePublicImageUrl } from "@/lib/cms-image";
import type { HeroSlide } from "@/lib/hero-slides-default";

function heroSafeSrc(url: string | undefined | null): string {
  const t = sanitizePublicImageUrl(url);
  if (!t) return "";
  if (t.includes("booking-header")) return "";
  return t;
}

async function loadHeroSlidesUncached(): Promise<HeroSlide[]> {
  const db = getAdminDb();
  if (!db) return [];
  try {
    const snap = await db.collection("heroSlides").get();
    if (snap.empty) return [];
    const rows = snap.docs.map((d) => {
      const x = d.data() as Record<string, unknown>;
      const videoUrl = String(x.videoUrl ?? x.videoURL ?? x.video_url ?? "").trim();
      const videoThumbnailUrl = heroSafeSrc(
        String(x.videoThumbnailUrl ?? x.video_thumbnail_url ?? ""),
      );
      const bookingRaw = String(x.bookingOption ?? x.booking_option ?? "").trim();
      const src = heroSafeSrc(String(x.imageUrl ?? ""));
      return {
        sortOrder: Number(x.sortOrder ?? 0),
        id: d.id,
        src,
        alt: String(x.alt ?? "Hero image").trim() || "Hero image",
        videoUrl: videoUrl.length > 0 ? videoUrl : undefined,
        videoThumbnailUrl: videoThumbnailUrl || undefined,
        useAmbientMusic: Boolean(x.useAmbientMusic),
        bookingOption: bookingRaw.length > 0 ? bookingRaw : undefined,
      };
    });
    rows.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
    return rows
      .filter((r) => r.src.length > 0 || r.videoUrl)
      .map((r) => ({
        src: r.src,
        alt: r.alt,
        videoUrl: r.videoUrl,
        videoThumbnailUrl: r.videoThumbnailUrl,
        useAmbientMusic: r.useAmbientMusic ? true : undefined,
        bookingOption: r.bookingOption,
      }));
  } catch {
    return [];
  }
}

/** Server-only hero slides — cached 1h (homepage reads). */
export async function getHeroSlidesServer(): Promise<HeroSlide[]> {
  return unstable_cache(
    loadHeroSlidesUncached,
    ["public-hero-slides-v1"],
    { revalidate: 3600, tags: ["hero-slides"] },
  )();
}
