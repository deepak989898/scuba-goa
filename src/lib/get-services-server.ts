import { getAdminDb } from "@/lib/firebase-admin";
import { sanitizeServiceImages } from "@/lib/cms-image";
import { docToService } from "@/lib/service-firestore";
import { seedCatalogIfEmpty } from "@/lib/seed-default-catalog";
import { fallbackServices, type ServiceItem } from "@/data/services";

function publicFallbackServices(): ServiceItem[] {
  return fallbackServices.map((s) => sanitizeServiceImages(s));
}

/** Merge missing fallback slugs so commercial pages (e.g. casino-bookings) stay reachable. */
function mergeServicesWithFallback(live: ServiceItem[]): ServiceItem[] {
  const bySlug = new Map(live.map((s) => [s.slug, s]));
  for (const fb of publicFallbackServices()) {
    if (!bySlug.has(fb.slug)) bySlug.set(fb.slug, fb);
  }
  return [...bySlug.values()].sort(
    (a, b) =>
      (a.sortOrder ?? 999) - (b.sortOrder ?? 999) ||
      a.slug.localeCompare(b.slug),
  );
}

/** Server-only: metadata & SSR when FIREBASE_SERVICE_ACCOUNT_KEY is set */
export async function getAllServicesServer(): Promise<ServiceItem[]> {
  const db = getAdminDb();
  if (!db) return publicFallbackServices();
  try {
    let snap = await db.collection("services").get();
    if (snap.empty) {
      await seedCatalogIfEmpty(db);
      snap = await db.collection("services").get();
    }
    if (snap.empty) return publicFallbackServices();
    const list: ServiceItem[] = [];
    for (const d of snap.docs) {
      const s = docToService(d.id, d.data() as Record<string, unknown>);
      if (s && s.active !== false) list.push(sanitizeServiceImages(s));
    }
    list.sort(
      (a, b) =>
        (a.sortOrder ?? 999) - (b.sortOrder ?? 999) ||
        a.slug.localeCompare(b.slug),
    );
    return mergeServicesWithFallback(list);
  } catch {
    return publicFallbackServices();
  }
}

export async function getServiceBySlugServer(
  slug: string,
): Promise<ServiceItem | null> {
  const db = getAdminDb();
  if (!db) {
    const s = fallbackServices.find((x) => x.slug === slug);
    return s ? sanitizeServiceImages(s) : null;
  }
  try {
    const peek = await db.collection("services").limit(1).get();
    if (peek.empty) {
      await seedCatalogIfEmpty(db);
    }
    const ref = await db.collection("services").doc(slug).get();
    if (!ref.exists) {
      const s = fallbackServices.find((x) => x.slug === slug);
      return s ? sanitizeServiceImages(s) : null;
    }
    const s = docToService(ref.id, ref.data() as Record<string, unknown>);
    if (s && s.active === false) {
      const fb = fallbackServices.find((x) => x.slug === slug);
      return fb ? sanitizeServiceImages(fb) : null;
    }
    return s ? sanitizeServiceImages(s) : null;
  } catch {
    const s = fallbackServices.find((x) => x.slug === slug);
    return s ? sanitizeServiceImages(s) : null;
  }
}
