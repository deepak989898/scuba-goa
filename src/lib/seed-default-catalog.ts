import type { Firestore } from "firebase-admin/firestore";
import type { PackageDoc } from "@/lib/types";
import { fallbackPackages } from "@/data/fallback-packages";
import { fallbackServices, type ServiceItem } from "@/data/services";
import { serviceToPayload } from "@/lib/service-firestore";

function packageToFirestore(p: PackageDoc) {
  const { id: _id, ...rest } = p;
  const row: Record<string, unknown> = {
    name: rest.name,
    price: rest.price,
    duration: rest.duration,
    includes: rest.includes,
    rating: rest.rating,
    imageUrl: rest.imageUrl ?? "",
    category: rest.category ?? "",
    isCombo: rest.isCombo ?? false,
    discountPct: rest.discountPct ?? 0,
    limitedSlots: rest.limitedSlots ?? false,
    active: true,
  };
  if (rest.slotsLeft !== undefined) row.slotsLeft = rest.slotsLeft;
  if (rest.bookedToday !== undefined) row.bookedToday = rest.bookedToday;
  return row;
}

/**
 * Writes built-in defaults when a collection has no documents.
 * Uses Firebase Admin (server only). Idempotent.
 */
export async function seedCatalogIfEmpty(db: Firestore): Promise<{
  packages: boolean;
  services: boolean;
}> {
  const result = { packages: false, services: false };

  const packagesPeek = await db.collection("packages").limit(1).get();
  if (packagesPeek.empty) {
    const batch = db.batch();
    for (const p of fallbackPackages) {
      const ref = db.collection("packages").doc();
      batch.set(ref, packageToFirestore(p));
    }
    await batch.commit();
    result.packages = true;
  }

  const servicesPeek = await db.collection("services").limit(1).get();
  if (servicesPeek.empty) {
    const batch = db.batch();
    fallbackServices.forEach((s, index) => {
      const ref = db.collection("services").doc(s.slug);
      const item: ServiceItem & { sortOrder: number } = {
        ...s,
        sortOrder: s.sortOrder ?? index,
        active: s.active !== false,
      };
      batch.set(ref, serviceToPayload(item));
    });
    await batch.commit();
    result.services = true;
  }

  return result;
}
