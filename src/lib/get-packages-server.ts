import { fallbackPackages } from "@/data/fallback-packages";
import { getAdminDb } from "@/lib/firebase-admin";
import { parseFirestoreIncludes } from "@/lib/parse-firestore-includes";
import { seedCatalogIfEmpty } from "@/lib/seed-default-catalog";
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

export async function getPackageByIdServer(id: string): Promise<PackageDoc | null> {
  const fromFallback = fallbackPackages.find((p) => p.id === id);
  const db = getAdminDb();
  if (!db) return fromFallback ?? null;
  try {
    const peek = await db.collection("packages").limit(1).get();
    if (peek.empty) {
      await seedCatalogIfEmpty(db);
    }
    const ref = await db.collection("packages").doc(id).get();
    if (!ref.exists) {
      return fromFallback ?? null;
    }
    const p = mapPackageDoc(ref.id, ref.data() as Record<string, unknown>);
    if (p.active === false) {
      return fromFallback ?? null;
    }
    return p;
  } catch {
    return fromFallback ?? null;
  }
}
