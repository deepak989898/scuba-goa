import { getAdminDb } from "@/lib/firebase-admin";
import { isGoaPlaceName, normalizeGoaCityKey } from "./goa";
import {
  GOA_DESTINATION_KEY,
  HOTEL_FIRESTORE,
  type TripjackHotelCatalogDoc,
  type TripjackHotelDestinationDoc,
} from "./types";

function catalogCol() {
  const db = getAdminDb();
  if (!db) return null;
  return db.collection(HOTEL_FIRESTORE.catalog);
}

function destCol() {
  const db = getAdminDb();
  if (!db) return null;
  return db.collection(HOTEL_FIRESTORE.destinations);
}

export function extractHotelImages(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  const out: string[] = [];
  const push = (u: unknown) => {
    if (typeof u === "string" && u.startsWith("http")) out.push(u);
  };
  if (Array.isArray(o.images)) {
    for (const img of o.images) {
      if (typeof img === "string") push(img);
      else if (img && typeof img === "object") {
        const i = img as Record<string, unknown>;
        push(i.url ?? i.imageUrl ?? i.src);
      }
    }
  }
  push(o.image);
  push(o.thumbnail);
  push(o.heroImage);
  if (Array.isArray(o.media)) {
    for (const m of o.media) {
      if (m && typeof m === "object") {
        const row = m as Record<string, unknown>;
        push(row.url ?? row.imageUrl);
      }
    }
  }
  return [...new Set(out)].slice(0, 12);
}

export function mapRawToCatalogDoc(
  raw: Record<string, unknown>,
  tjHotelId: string,
): TripjackHotelCatalogDoc | null {
  const name =
    String(raw.name ?? raw.hotelName ?? raw.title ?? "").trim() ||
    String(raw.hn ?? "").trim();
  if (!name) return null;

  const cityRaw = String(
    raw.city ?? raw.cityName ?? raw.destination ?? raw.locality ?? "Goa",
  ).trim();
  const cityKey = normalizeGoaCityKey(cityRaw);
  const country = String(raw.country ?? raw.countryName ?? "India").trim();

  const visible =
    isGoaPlaceName(cityRaw) ||
    isGoaPlaceName(String(raw.state ?? "")) ||
    country.toLowerCase() === "india" &&
      (cityKey === "goa" || isGoaPlaceName(name));

  const star = Number(raw.starRating ?? raw.stars ?? raw.rating);
  const starRating = Number.isFinite(star) && star > 0 ? star : undefined;

  const priceFrom = Number(
    raw.priceFrom ?? raw.minPrice ?? raw.displayPrice ?? raw.tf ?? raw.price,
  );
  const now = new Date().toISOString();

  return {
    tjHotelId,
    name,
    city: cityKey,
    cityNameLower: cityKey,
    locality: String(raw.locality ?? raw.area ?? raw.location ?? "").trim() || undefined,
    country: country || "India",
    images: extractHotelImages(raw),
    starRating,
    websiteVisible: visible,
    priceFrom: Number.isFinite(priceFrom) && priceFrom > 0 ? Math.round(priceFrom) : undefined,
    priceCurrency: String(raw.currency ?? "INR"),
    cachedPriceUpdatedAt: Number.isFinite(priceFrom) ? now : undefined,
    description:
      typeof raw.description === "string" ? raw.description.slice(0, 4000) : undefined,
    amenities: Array.isArray(raw.amenities)
      ? raw.amenities.map((a) => String(a)).slice(0, 40)
      : undefined,
    syncedAt: now,
    updatedAt: now,
  };
}

export async function listVisibleGoaHotels(limit = 60): Promise<TripjackHotelCatalogDoc[]> {
  const col = catalogCol();
  if (!col) return [];

  const snap = await col.where("websiteVisible", "==", true).limit(limit * 2).get();

  return snap.docs
    .map((d) => d.data() as TripjackHotelCatalogDoc)
    .filter((h) => h.cityNameLower === "goa" || h.city === "goa")
    .slice(0, limit);
}

export async function getCatalogHotel(tjHotelId: string): Promise<TripjackHotelCatalogDoc | null> {
  const col = catalogCol();
  if (!col) return null;
  const doc = await col.doc(tjHotelId).get();
  if (!doc.exists) return null;
  return doc.data() as TripjackHotelCatalogDoc;
}

export async function upsertCatalogHotel(doc: TripjackHotelCatalogDoc): Promise<void> {
  const col = catalogCol();
  if (!col) throw new Error("Database not configured");
  await col.doc(doc.tjHotelId).set(doc, { merge: true });
}

export async function upsertGoaDestinationHids(hids: string[]): Promise<void> {
  const col = destCol();
  if (!col) throw new Error("Database not configured");
  const unique = [...new Set(hids.filter(Boolean))];
  const now = new Date().toISOString();
  await col.doc(GOA_DESTINATION_KEY).set(
    {
      key: GOA_DESTINATION_KEY,
      name: "Goa, India",
      country: "India",
      hids: unique,
      updatedAt: now,
    } satisfies TripjackHotelDestinationDoc,
    { merge: true },
  );
}

export async function getGoaDestinationHids(): Promise<string[]> {
  const col = destCol();
  if (!col) return [];
  const doc = await col.doc(GOA_DESTINATION_KEY).get();
  if (!doc.exists) return [];
  const data = doc.data() as TripjackHotelDestinationDoc;
  return Array.isArray(data.hids) ? data.hids : [];
}

export async function updateCachedPrice(
  tjHotelId: string,
  priceFrom: number,
  currency = "INR",
): Promise<void> {
  const col = catalogCol();
  if (!col) return;
  const now = new Date().toISOString();
  await col.doc(tjHotelId).set(
    {
      priceFrom: Math.round(priceFrom),
      priceCurrency: currency,
      cachedPriceUpdatedAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
}
