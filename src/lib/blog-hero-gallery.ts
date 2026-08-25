import type { ServiceItem } from "@/data/services";
import { pickBlogFeaturedImage } from "@/lib/cms-image";
import { serviceDetailImages } from "@/lib/service-images";

export type BlogHeroGallerySlide = {
  url: string;
  alt: string;
  href?: string;
};

function pushSlide(
  slides: BlogHeroGallerySlide[],
  seen: Set<string>,
  url: string,
  alt: string,
  href?: string,
): void {
  const clean =
    pickBlogFeaturedImage(url) ||
    (url.trim().startsWith("http") ? url.trim() : "");
  if (!clean || seen.has(clean)) return;
  seen.add(clean);
  slides.push({ url: clean, alt, href });
}

/**
 * Blog hero slides: featured image first, then photos from related services.
 */
export function buildBlogHeroGallerySlides(
  input: {
    title: string;
    featuredPrimary: string;
    featuredFallback: string;
    relatedServices: ServiceItem[];
    focusServiceSlug?: string;
  },
  maxSlides = 6,
): BlogHeroGallerySlide[] {
  const slides: BlogHeroGallerySlide[] = [];
  const seen = new Set<string>();
  const title = input.title.trim() || "Blog article";

  if (input.featuredPrimary) {
    pushSlide(slides, seen, input.featuredPrimary, title);
  } else if (input.featuredFallback) {
    pushSlide(slides, seen, input.featuredFallback, title);
  }

  const focus = input.focusServiceSlug?.trim();
  const ordered = focus
    ? [
        ...input.relatedServices.filter((s) => s.slug === focus),
        ...input.relatedServices.filter((s) => s.slug !== focus),
      ]
    : input.relatedServices;

  for (const service of ordered) {
    const imgs = serviceDetailImages(service);
    for (const img of imgs.slice(0, 3)) {
      pushSlide(
        slides,
        seen,
        img,
        `${service.title} in Goa`,
        `/services/${service.slug}`,
      );
      if (slides.length >= maxSlides) return slides;
    }
  }

  return slides;
}
