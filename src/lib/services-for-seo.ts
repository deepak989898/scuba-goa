import { fallbackServices, type ServiceItem } from "@/data/services";
import { getAllServicesServer } from "@/lib/get-services-server";

/**
 * Services that should appear in sitemaps / GSC inventory.
 * When Firestore has a live catalog, do NOT merge missing fallback slugs —
 * those become sitemap 404s (e.g. /services/pubs, /services/disco).
 */
export async function getServicesForPublicSeo(): Promise<ServiceItem[]> {
  try {
    const live = await getAllServicesServer();
    if (live.length > 0) {
      return live.filter((s) => Boolean(s.slug) && s.active !== false);
    }
  } catch {
    /* fall through */
  }
  return fallbackServices.filter((s) => Boolean(s.slug) && s.active !== false);
}
