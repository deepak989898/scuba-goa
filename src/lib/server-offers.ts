import { getAdminDb } from "@/lib/firebase-admin";
import type { OfferDoc } from "@/lib/types";

export function mapOfferDoc(
  id: string,
  x: Record<string, unknown>
): OfferDoc {
  return {
    id,
    title: String(x.title ?? ""),
    description: String(x.description ?? ""),
    promoCode: String(x.promoCode ?? "")
      .replace(/\s+/g, "")
      .toUpperCase(),
    discountPercent: Number(x.discountPercent ?? 0),
    minCartUnits:
      x.minCartUnits !== undefined ? Math.max(1, Math.floor(Number(x.minCartUnits))) : 1,
    maxCartUnits:
      x.maxCartUnits !== undefined && x.maxCartUnits !== null
        ? Math.floor(Number(x.maxCartUnits))
        : null,
    category: x.category ? String(x.category) : undefined,
    sortOrder: x.sortOrder !== undefined ? Number(x.sortOrder) : 0,
    active: x.active !== false,
  };
}

/** Active offer matching normalized promo code (first match wins). */
export async function fetchActiveOfferByPromoCode(
  codeUpper: string
): Promise<OfferDoc | null> {
  const db = getAdminDb();
  if (!db || !codeUpper) return null;
  const snap = await db.collection("offers").where("promoCode", "==", codeUpper).limit(8).get();
  for (const d of snap.docs) {
    const o = mapOfferDoc(d.id, d.data() as Record<string, unknown>);
    if (o.active !== false && o.promoCode === codeUpper) return o;
  }
  return null;
}

/** All active offers for public listing, sorted. */
export async function fetchActiveOffersPublic(): Promise<OfferDoc[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection("offers").get();
  const rows: OfferDoc[] = [];
  for (const d of snap.docs) {
    const o = mapOfferDoc(d.id, d.data() as Record<string, unknown>);
    if (o.active === false) continue;
    rows.push(o);
  }
  rows.sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title)
  );
  return rows;
}
