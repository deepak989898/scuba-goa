import { getAdminDb } from "@/lib/firebase-admin";
import { parseFirestoreIncludes } from "@/lib/parse-firestore-includes";
import { seedCatalogIfEmpty } from "@/lib/seed-default-catalog";
import { fallbackPackages } from "@/data/fallback-packages";
import type { PackageDoc } from "@/lib/types";

function mapPackageDoc(id: string, data: Record<string, unknown>): PackageDoc {
  const imageRaw = data.imageUrl != null ? String(data.imageUrl).trim() : "";
  return {
    id,
    name: String(data.name ?? ""),
    price: Number(data.price ?? 0),
    duration: String(data.duration ?? ""),
    includes: parseFirestoreIncludes(data.includes),
    rating: Number(data.rating ?? 4.8),
    slotsLeft:
      data.slotsLeft !== undefined ? Number(data.slotsLeft) : undefined,
    bookedToday:
      data.bookedToday !== undefined ? Number(data.bookedToday) : undefined,
    imageUrl: imageRaw || undefined,
    category: data.category ? String(data.category) : undefined,
    isCombo: Boolean(data.isCombo),
    discountPct:
      data.discountPct !== undefined ? Number(data.discountPct) : undefined,
    limitedSlots: Boolean(data.limitedSlots),
    active: data.active !== false,
  };
}

/** Server-only: booking packages for SSR, blog catalog, and schema. */
export async function getAllPackagesServer(): Promise<PackageDoc[]> {
  const db = getAdminDb();
  if (!db) return fallbackPackages;
  try {
    let snap = await db.collection("packages").get();
    if (snap.empty) {
      await seedCatalogIfEmpty(db);
      snap = await db.collection("packages").get();
    }
    if (snap.empty) return fallbackPackages;
    const list = snap.docs
      .map((d) => mapPackageDoc(d.id, d.data() as Record<string, unknown>))
      .filter((p) => p.active !== false && p.name && p.price > 0);
    list.sort((a, b) => a.price - b.price);
    return list.length === 0 ? fallbackPackages : list;
  } catch {
    return fallbackPackages;
  }
}
