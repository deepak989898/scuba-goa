import { unstable_cache } from "next/cache";
import type {
  Firestore,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import {
  getSafarSathiAdminDb,
  getSafarSathiAdminInitMessage,
  getSafarSathiProjectId,
} from "@/lib/safar-sathi-firebase-admin";
import {
  GOA_HOTELS_COLLECTION,
  type GoaHotelDoc,
  type GoaHotelRoom,
} from "./types";
import { hasHotelPhoto } from "./images";
import {
  normalizeHotelRooms,
  resolveHotelPriceFrom,
} from "./normalize-pricing";

/** Max hotels shown on /hotels (full collection is paginated up to this cap). */
export const GOA_HOTELS_LIST_CAP = 1000;

/** Safar Sathi export — accept sharedFor, cityKey, or Goa location label. */
function isGoaHotelForWebsite(raw: Record<string, unknown>): boolean {
  if (raw.isDeleted === true) return false;
  if (raw.websiteVisible === false) return false;

  const sharedFor = String(raw.sharedFor ?? "").toLowerCase();
  if (sharedFor === "bookscubagoa") return true;

  const cityKey = String(raw.cityKey ?? "").toLowerCase();
  if (cityKey === "goa") return true;

  const location = String(raw.location ?? raw.cityName ?? raw.locality ?? "").toLowerCase();
  return location.includes("goa");
}

/** Facilities/policies may be array, map, or {name} objects in Safar Sathi export. */
function normalizeStringList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .flatMap((item) => {
        if (typeof item === "string") return item.trim() ? [item.trim()] : [];
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          const label = String(o.name ?? o.label ?? o.title ?? o.value ?? "").trim();
          return label ? [label] : [];
        }
        return [];
      })
      .filter(Boolean);
  }
  if (raw && typeof raw === "object") {
    return Object.values(raw as Record<string, unknown>).flatMap((v) =>
      normalizeStringList(v),
    );
  }
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
}

function normalizeImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const url = String(item ?? "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function normalizeRooms(raw: unknown, priceFrom = 0): GoaHotelRoom[] {
  return normalizeHotelRooms(raw, priceFrom);
}

function normalizeHotel(raw: Record<string, unknown>, docId: string): GoaHotelDoc | null {
  if (!isGoaHotelForWebsite(raw)) return null;

  const imageUrls = normalizeImageUrls(raw.imageUrls);
  const images = normalizeImageUrls(raw.images);
  const mergedImages = [...new Set([...imageUrls, ...images])];
  const heroImage = String(raw.heroImage ?? mergedImages[0] ?? "").trim();

  const preliminaryPrice = resolveHotelPriceFrom(raw, []);
  const rooms = normalizeRooms(
    raw.rooms ?? raw.roomTypes ?? raw.roomList ?? raw.roomOptions,
    preliminaryPrice,
  );
  const priceFrom = resolveHotelPriceFrom(raw, rooms);

  return {
    id: String(raw.id ?? docId),
    tjHotelId: Number(raw.tjHotelId ?? 0),
    name: String(raw.name ?? "Hotel"),
    slug: String(raw.slug ?? docId),
    cityName: String(raw.cityName ?? "Goa"),
    cityKey: "goa",
    locality: raw.locality ? String(raw.locality) : undefined,
    location: String(raw.location ?? raw.locality ?? raw.cityName ?? "Goa"),
    address: String(raw.address ?? ""),
    description: String(raw.description ?? ""),
    facilities: normalizeStringList(raw.facilities),
    policies: normalizeStringList(raw.policies),
    starRating:
      raw.starRating === null || raw.starRating === undefined
        ? null
        : Number(raw.starRating),
    heroImage: heroImage || undefined,
    imageUrls: mergedImages,
    images: mergedImages,
    priceFrom,
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

/**
 * Read `goaHotels` with pagination — Admin SDK bypasses client rules.
 * Uses document ID order so no composite index is required.
 * Pass `maxDocs = 0` to read the entire collection (health checks only).
 */
async function fetchAllGoaHotelDocs(
  db: Firestore,
  maxDocs = GOA_HOTELS_LIST_CAP,
): Promise<QueryDocumentSnapshot[]> {
  const unlimited = maxDocs <= 0;
  const cap = unlimited ? Number.POSITIVE_INFINITY : Math.min(2000, Math.max(1, maxDocs));
  const pageSize = 200;
  const all: QueryDocumentSnapshot[] = [];
  let last: QueryDocumentSnapshot | undefined;

  while (unlimited || all.length < cap) {
    const remaining = unlimited ? pageSize : Math.min(pageSize, cap - all.length);
    let query = db.collection(GOA_HOTELS_COLLECTION).orderBy("__name__").limit(remaining);

    if (last) {
      query = query.startAfter(last);
    }

    const snap = await query.get();
    if (snap.empty) break;

    all.push(...snap.docs);
    last = snap.docs[snap.docs.length - 1];

    if (snap.docs.length < pageSize) break;
  }

  return all;
}

type GoaHotelExclusionReason =
  | "deleted"
  | "not_website_visible"
  | "not_goa_or_not_shared";

function classifyGoaHotelExclusion(raw: Record<string, unknown>): GoaHotelExclusionReason | null {
  if (raw.isDeleted === true) return "deleted";
  if (raw.websiteVisible === false) return "not_website_visible";
  if (!isGoaHotelForWebsite(raw)) return "not_goa_or_not_shared";
  return null;
}

async function listGoaHotelsUncached(limit = GOA_HOTELS_LIST_CAP): Promise<GoaHotelDoc[]> {
  const db = getSafarSathiAdminDb();
  if (!db) return [];

  const cap = Math.min(GOA_HOTELS_LIST_CAP, Math.max(1, limit));
  const docs = await fetchAllGoaHotelDocs(db, cap);

  return docs
    .map((d) => normalizeHotel(d.data() as Record<string, unknown>, d.id))
    .filter((h): h is GoaHotelDoc => Boolean(h))
    .filter(hasHotelPhoto)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listGoaHotels(limit = GOA_HOTELS_LIST_CAP): Promise<GoaHotelDoc[]> {
  const cap = Math.min(GOA_HOTELS_LIST_CAP, Math.max(1, limit));
  return unstable_cache(
    () => listGoaHotelsUncached(cap),
    ["goa-hotels-list-v6", String(cap)],
    { revalidate: 600, tags: ["goa-hotels"] },
  )();
}

async function getGoaHotelBySlugUncached(slug: string): Promise<GoaHotelDoc | null> {
  const db = getSafarSathiAdminDb();
  if (!db || !slug.trim()) return null;

  const key = slug.trim();

  try {
    const snap = await db
      .collection(GOA_HOTELS_COLLECTION)
      .where("slug", "==", key)
      .limit(1)
      .get();
    if (!snap.empty) {
      const d = snap.docs[0];
      const hotel = normalizeHotel(d.data() as Record<string, unknown>, d.id);
      if (hotel) return hotel;
    }
  } catch {
    /* fall through */
  }

  const docIds = [key, key.startsWith("tj_") ? key : `tj_${key}`];
  for (const docId of docIds) {
    const snap = await db.collection(GOA_HOTELS_COLLECTION).doc(docId).get();
    if (snap.exists) {
      const hotel = normalizeHotel(snap.data() as Record<string, unknown>, snap.id);
      if (hotel) return hotel;
    }
  }

  return null;
}

export async function getGoaHotelBySlug(slug: string): Promise<GoaHotelDoc | null> {
  const key = slug.trim();
  if (!key) return null;
  return unstable_cache(
    () => getGoaHotelBySlugUncached(key),
    ["goa-hotel-slug-v4", key],
    { revalidate: 600, tags: ["goa-hotels", `goa-hotel-${key}`] },
  )();
}

export async function listGoaHotelSlugs(limit = GOA_HOTELS_LIST_CAP): Promise<string[]> {
  const hotels = await listGoaHotels(limit);
  return hotels.map((h) => h.slug).filter(Boolean);
}

export function findHotelRoom(
  hotel: GoaHotelDoc,
  roomId: string,
): GoaHotelRoom | null {
  return hotel.rooms.find((r) => r.id === roomId) ?? null;
}

/** Diagnostics — full `goaHotels` collection scan vs visible after filters. */
export async function getGoaHotelsCatalogStatus(): Promise<{
  configured: boolean;
  projectId: string | null;
  initMessage: string | null;
  totalDocumentCount: number;
  visibleHotelCount: number;
  listedHotelCount: number;
  excluded: {
    deleted: number;
    notWebsiteVisible: number;
    notGoaOrNotShared: number;
    noPhoto: number;
  };
  sampleHotelName: string | null;
  sampleHotelSlug: string | null;
}> {
  const db = getSafarSathiAdminDb();
  if (!db) {
    return {
      configured: false,
      projectId: getSafarSathiProjectId(),
      initMessage: getSafarSathiAdminInitMessage(),
      totalDocumentCount: 0,
      visibleHotelCount: 0,
      listedHotelCount: 0,
      excluded: { deleted: 0, notWebsiteVisible: 0, notGoaOrNotShared: 0, noPhoto: 0 },
      sampleHotelName: null,
      sampleHotelSlug: null,
    };
  }

  const docs = await fetchAllGoaHotelDocs(db, 0);
  const excluded = { deleted: 0, notWebsiteVisible: 0, notGoaOrNotShared: 0, noPhoto: 0 };
  const hotels: GoaHotelDoc[] = [];

  for (const d of docs) {
    const raw = d.data() as Record<string, unknown>;
    const reason = classifyGoaHotelExclusion(raw);
    if (reason === "deleted") excluded.deleted += 1;
    else if (reason === "not_website_visible") excluded.notWebsiteVisible += 1;
    else if (reason === "not_goa_or_not_shared") excluded.notGoaOrNotShared += 1;
    else {
      const hotel = normalizeHotel(raw, d.id);
      if (!hotel) continue;
      if (!hasHotelPhoto(hotel)) {
        excluded.noPhoto += 1;
        continue;
      }
      hotels.push(hotel);
    }
  }

  const listedHotelCount = Math.min(hotels.length, GOA_HOTELS_LIST_CAP);

  return {
    configured: true,
    projectId: getSafarSathiProjectId(),
    initMessage: null,
    totalDocumentCount: docs.length,
    visibleHotelCount: hotels.length,
    listedHotelCount,
    excluded,
    sampleHotelName: hotels[0]?.name ?? null,
    sampleHotelSlug: hotels[0]?.slug ?? null,
  };
}
