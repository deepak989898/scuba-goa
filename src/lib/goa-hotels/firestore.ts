import { unstable_cache } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  GOA_HOTELS_COLLECTION,
  type GoaHotelDoc,
  type GoaHotelRoom,
} from "./types";

function normalizeHotel(raw: Record<string, unknown>, docId: string): GoaHotelDoc | null {
  const cityKey = String(raw.cityKey ?? "").toLowerCase();
  if (cityKey !== "goa") return null;
  if (raw.isDeleted === true) return null;
  if (raw.websiteVisible === false) return null;

  const roomsRaw = Array.isArray(raw.rooms) ? raw.rooms : [];
  const rooms: GoaHotelRoom[] = roomsRaw
    .filter((r) => r && typeof r === "object")
    .map((r) => {
      const o = r as Record<string, unknown>;
      return {
        id: String(o.id ?? ""),
        name: String(o.name ?? "Room"),
        type: String(o.type ?? ""),
        mealBasis: String(o.mealBasis ?? ""),
        mealBasisLabel: String(o.mealBasisLabel ?? o.mealBasis ?? ""),
        pricePerNight: Number(o.pricePerNight ?? 0),
        totalPrice: Number(o.totalPrice ?? 0),
        basePrice: Number(o.basePrice ?? 0),
        taxes: Number(o.taxes ?? 0),
        currency: String(o.currency ?? "INR"),
        maxGuests: Number(o.maxGuests ?? 2),
        available: o.available !== false,
        isRefundable: Boolean(o.isRefundable),
        inclusions: Array.isArray(o.inclusions)
          ? o.inclusions.map((x) => String(x))
          : [],
        images: Array.isArray(o.images) ? o.images.map((x) => String(x)) : [],
      };
    })
    .filter((r) => r.id && r.available);

  const imageUrls = Array.isArray(raw.imageUrls)
    ? raw.imageUrls.map((x) => String(x)).filter(Boolean)
    : [];
  const images = Array.isArray(raw.images)
    ? raw.images.map((x) => String(x)).filter(Boolean)
    : imageUrls;

  const heroImage = String(raw.heroImage ?? images[0] ?? imageUrls[0] ?? "").trim();

  return {
    id: String(raw.id ?? docId),
    tjHotelId: Number(raw.tjHotelId ?? 0),
    name: String(raw.name ?? "Hotel"),
    slug: String(raw.slug ?? docId),
    cityName: String(raw.cityName ?? "Goa"),
    cityKey: "goa",
    locality: raw.locality ? String(raw.locality) : undefined,
    location: String(raw.location ?? raw.locality ?? "Goa"),
    address: String(raw.address ?? ""),
    description: String(raw.description ?? ""),
    facilities: Array.isArray(raw.facilities)
      ? raw.facilities.map((x) => String(x))
      : [],
    policies: Array.isArray(raw.policies) ? raw.policies.map((x) => String(x)) : [],
    starRating:
      raw.starRating === null || raw.starRating === undefined
        ? null
        : Number(raw.starRating),
    heroImage: heroImage || undefined,
    imageUrls: imageUrls.length ? imageUrls : images,
    images: images.length ? images : imageUrls,
    priceFrom: Number(raw.priceFrom ?? 0),
    currency: String(raw.currency ?? "INR"),
    rooms,
    lastPricedAt: raw.lastPricedAt ? String(raw.lastPricedAt) : undefined,
    contentSynced: Boolean(raw.contentSynced),
    websiteVisible: true,
    isDeleted: false,
    source: raw.source ? String(raw.source) : undefined,
    sharedFor: raw.sharedFor ? String(raw.sharedFor) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

async function listGoaHotelsUncached(limit = 48): Promise<GoaHotelDoc[]> {
  const db = getAdminDb();
  if (!db) return [];

  const cap = Math.min(80, Math.max(1, limit));

  try {
    const snap = await db
      .collection(GOA_HOTELS_COLLECTION)
      .where("cityKey", "==", "goa")
      .where("isDeleted", "==", false)
      .where("websiteVisible", "==", true)
      .orderBy("name")
      .limit(cap)
      .get();
    return snap.docs
      .map((d) => normalizeHotel(d.data() as Record<string, unknown>, d.id))
      .filter((h): h is GoaHotelDoc => Boolean(h));
  } catch {
    const snap = await db
      .collection(GOA_HOTELS_COLLECTION)
      .where("cityKey", "==", "goa")
      .limit(cap * 2)
      .get();
    return snap.docs
      .map((d) => normalizeHotel(d.data() as Record<string, unknown>, d.id))
      .filter((h): h is GoaHotelDoc => Boolean(h))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, cap);
  }
}

export async function listGoaHotels(limit = 48): Promise<GoaHotelDoc[]> {
  return unstable_cache(
    () => listGoaHotelsUncached(limit),
    ["goa-hotels-list-v1", String(limit)],
    { revalidate: 3600, tags: ["goa-hotels"] },
  )();
}

async function getGoaHotelBySlugUncached(slug: string): Promise<GoaHotelDoc | null> {
  const db = getAdminDb();
  if (!db || !slug.trim()) return null;

  try {
    const snap = await db
      .collection(GOA_HOTELS_COLLECTION)
      .where("slug", "==", slug.trim())
      .limit(1)
      .get();
    if (!snap.empty) {
      const d = snap.docs[0];
      return normalizeHotel(d.data() as Record<string, unknown>, d.id);
    }
  } catch {
    /* fall through */
  }

  const byId = await db.collection(GOA_HOTELS_COLLECTION).doc(slug.trim()).get();
  if (byId.exists) {
    return normalizeHotel(byId.data() as Record<string, unknown>, byId.id);
  }

  const prefixed = slug.startsWith("tj_") ? slug : `tj_${slug}`;
  const byTj = await db.collection(GOA_HOTELS_COLLECTION).doc(prefixed).get();
  if (byTj.exists) {
    return normalizeHotel(byTj.data() as Record<string, unknown>, byTj.id);
  }

  return null;
}

export async function getGoaHotelBySlug(slug: string): Promise<GoaHotelDoc | null> {
  const key = slug.trim();
  if (!key) return null;
  return unstable_cache(
    () => getGoaHotelBySlugUncached(key),
    ["goa-hotel-slug-v1", key],
    { revalidate: 3600, tags: ["goa-hotels", `goa-hotel-${key}`] },
  )();
}

export async function listGoaHotelSlugs(limit = 60): Promise<string[]> {
  const hotels = await listGoaHotels(limit);
  return hotels.map((h) => h.slug).filter(Boolean);
}

export function pickHotelHeroImage(hotel: GoaHotelDoc): string {
  return hotel.heroImage || hotel.imageUrls[0] || hotel.images[0] || "";
}

export function findHotelRoom(
  hotel: GoaHotelDoc,
  roomId: string,
): GoaHotelRoom | null {
  return hotel.rooms.find((r) => r.id === roomId) ?? null;
}
