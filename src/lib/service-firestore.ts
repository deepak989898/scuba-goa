import type { ServiceItem, SubServiceItem } from "@/data/services";
import { parseFirestoreIncludes } from "@/lib/parse-firestore-includes";

export type ServiceFirestorePayload = {
  title: string;
  short: string;
  priceFrom: number;
  image: string;
  duration: string;
  rating: number;
  includes: string[];
  slotsLeft?: number;
  bookedToday?: number;
  limitedSlots?: boolean;
  mostBooked?: boolean;
  /** Visible on site when true (default). */
  active: boolean;
  /** Sort order on site (lower first) */
  sortOrder: number;
  detailContent?: string;
  subServices?: SubServiceItem[];
  /** Extra hero images (detail slider); primary `image` is not repeated here */
  galleryUrls?: string[];
  serviceMedia?: {
    posts?: string[];
    reels?: string[];
    videos?: string[];
  };
};

function parseUrlList(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    const urls = raw
      .map((x) => String(x).trim())
      .filter(Boolean);
    return urls.length ? [...new Set(urls)] : undefined;
  }
  if (typeof raw === "string" && raw.trim()) {
    const urls = raw
      .split(/[\n,]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    return urls.length ? [...new Set(urls)] : undefined;
  }
  return undefined;
}

function parseGalleryUrls(
  raw: unknown,
  primaryImage: string
): string[] | undefined {
  const pri = primaryImage.trim();
  const list: string[] = [];
  if (Array.isArray(raw)) {
    for (const x of raw) {
      const u = String(x).trim();
      if (u && u !== pri && !list.includes(u)) list.push(u);
    }
  } else if (typeof raw === "string" && raw.trim()) {
    for (const u of raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)) {
      if (u !== pri && !list.includes(u)) list.push(u);
    }
  }
  return list.length ? list : undefined;
}

function parseSubServices(raw: unknown): SubServiceItem[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: SubServiceItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title = String(o.title ?? "").trim();
    if (!title) continue;
    const inc = parseFirestoreIncludes(o.includes);
    const desc = String(o.description ?? "").trim();
    const pf = o.priceFrom;
    const idRaw = o.id != null ? String(o.id).trim() : "";
    const row: SubServiceItem = {
      title,
      description: desc || undefined,
      priceFrom:
        pf !== undefined && pf !== null && String(pf).trim() !== ""
          ? Number(pf)
          : undefined,
      includes: inc.length ? inc : undefined,
    };
    if (idRaw) row.id = idRaw;
    const sl = o.slotsLeft;
    if (sl !== undefined && sl !== null && String(sl).trim() !== "") {
      const n = Number(sl);
      if (Number.isFinite(n)) row.slotsLeft = n;
    }
    const bt = o.bookedToday;
    if (bt !== undefined && bt !== null && String(bt).trim() !== "") {
      const n = Number(bt);
      if (Number.isFinite(n)) row.bookedToday = n;
    }
    out.push(row);
  }
  return out.length ? out : undefined;
}

export function docToService(
  docId: string,
  data: Record<string, unknown>
): ServiceItem | null {
  const title = String(data.title ?? "");
  if (!title) return null;
  const includes = parseFirestoreIncludes(data.includes);
  const detailRaw = String(data.detailContent ?? "").trim();
  const subServices = parseSubServices(data.subServices);
  const image = String(data.image ?? "").trim();
  const galleryUrls = parseGalleryUrls(data.galleryUrls, image);
  const serviceMediaRaw =
    data.serviceMedia && typeof data.serviceMedia === "object"
      ? (data.serviceMedia as Record<string, unknown>)
      : null;
  return {
    slug: docId,
    title,
    short: String(data.short ?? ""),
    priceFrom: Number(data.priceFrom ?? 0),
    image,
    galleryUrls,
    active: data.active !== false,
    duration: String(data.duration ?? ""),
    rating: Number(data.rating ?? 4.8),
    includes,
    slotsLeft:
      data.slotsLeft !== undefined ? Number(data.slotsLeft) : undefined,
    bookedToday:
      data.bookedToday !== undefined ? Number(data.bookedToday) : undefined,
    limitedSlots: Boolean(data.limitedSlots),
    mostBooked: Boolean(data.mostBooked),
    sortOrder:
      data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
    detailContent: detailRaw || undefined,
    subServices,
    serviceMedia: serviceMediaRaw
      ? {
          posts: parseUrlList(serviceMediaRaw.posts),
          reels: parseUrlList(serviceMediaRaw.reels),
          videos: parseUrlList(serviceMediaRaw.videos),
        }
      : undefined,
  };
}

export function serviceToPayload(
  s: ServiceItem & { sortOrder?: number }
): ServiceFirestorePayload {
  const payload: ServiceFirestorePayload = {
    title: s.title,
    short: s.short,
    priceFrom: s.priceFrom,
    image: s.image,
    duration: s.duration,
    rating: s.rating,
    includes: s.includes,
    /** Firestore rejects `undefined` — omit or use concrete booleans */
    limitedSlots: Boolean(s.limitedSlots),
    mostBooked: Boolean(s.mostBooked),
    active: s.active !== false,
    sortOrder: s.sortOrder ?? 0,
  };
  if (s.slotsLeft !== undefined) payload.slotsLeft = s.slotsLeft;
  if (s.bookedToday !== undefined) payload.bookedToday = s.bookedToday;
  const d = (s.detailContent ?? "").trim();
  if (d) payload.detailContent = d;
  if (s.subServices?.length) {
    payload.subServices = s.subServices.map((sub) => {
      const row: SubServiceItem = { title: sub.title };
      const sid = sub.id?.trim();
      if (sid) row.id = sid;
      const d = sub.description?.trim();
      if (d) row.description = d;
      if (sub.priceFrom != null && Number.isFinite(sub.priceFrom)) {
        row.priceFrom = sub.priceFrom;
      }
      if (sub.includes?.length) row.includes = sub.includes;
      if (sub.slotsLeft != null && Number.isFinite(sub.slotsLeft)) {
        row.slotsLeft = sub.slotsLeft;
      }
      if (sub.bookedToday != null && Number.isFinite(sub.bookedToday)) {
        row.bookedToday = sub.bookedToday;
      }
      return row;
    });
  }
  const extras =
    s.galleryUrls
      ?.map((u) => String(u).trim())
      .filter((u) => u.length > 0 && u !== s.image.trim()) ?? [];
  const dedup: string[] = [];
  for (const u of extras) {
    if (!dedup.includes(u)) dedup.push(u);
  }
  if (dedup.length) payload.galleryUrls = dedup;
  const media = s.serviceMedia;
  if (media) {
    const posts = parseUrlList(media.posts);
    const reels = parseUrlList(media.reels);
    const videos = parseUrlList(media.videos);
    if (posts?.length || reels?.length || videos?.length) {
      payload.serviceMedia = {};
      if (posts?.length) payload.serviceMedia.posts = posts;
      if (reels?.length) payload.serviceMedia.reels = reels;
      if (videos?.length) payload.serviceMedia.videos = videos;
    }
  }
  return payload;
}
