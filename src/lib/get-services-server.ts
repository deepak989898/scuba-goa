import { getAdminDb } from "@/lib/firebase-admin";
import { docToService } from "@/lib/service-firestore";
import { fallbackServices, type ServiceItem } from "@/data/services";

/** Server-only: metadata & SSR when FIREBASE_SERVICE_ACCOUNT_KEY is set */
export async function getAllServicesServer(): Promise<ServiceItem[]> {
  const db = getAdminDb();
  if (!db) return fallbackServices;
  try {
    const snap = await db.collection("services").get();
    if (snap.empty) return fallbackServices;
    const list: ServiceItem[] = [];
    for (const d of snap.docs) {
      const s = docToService(d.id, d.data() as Record<string, unknown>);
      if (s && s.active !== false) list.push(s);
    }
    list.sort(
      (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.slug.localeCompare(b.slug)
    );
    return list.length === 0 ? fallbackServices : list;
  } catch {
    return fallbackServices;
  }
}

export async function getServiceBySlugServer(
  slug: string
): Promise<ServiceItem | null> {
  const db = getAdminDb();
  if (!db) return fallbackServices.find((s) => s.slug === slug) ?? null;
  try {
    const ref = await db.collection("services").doc(slug).get();
    if (!ref.exists) {
      return fallbackServices.find((s) => s.slug === slug) ?? null;
    }
    const s = docToService(ref.id, ref.data() as Record<string, unknown>);
    if (s && s.active === false) {
      return fallbackServices.find((x) => x.slug === slug) ?? null;
    }
    return s;
  } catch {
    return fallbackServices.find((s) => s.slug === slug) ?? null;
  }
}
