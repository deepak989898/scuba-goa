import { SITE_URL } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase-admin";
import { normalizeGalleryCategory } from "@/lib/gallery-categories";
import { getAllServicesServer } from "@/lib/get-services-server";
import type { SocialContentPayload } from "@/lib/social-media/types";

export type SocialMediaSource = "gallery" | "service";

export type GalleryMediaRow = {
  id: string;
  title: string;
  mediaUrl: string;
  posterUrl?: string;
  category?: string;
  contentType: "video" | "reel";
  sortOrder: number;
  source: SocialMediaSource;
  serviceSlug?: string;
};

const SERVICE_ID_PREFIX = "svc:";

export function isServiceMediaId(id: string): boolean {
  return id.startsWith(SERVICE_ID_PREFIX);
}

export function buildServiceMediaId(
  serviceSlug: string,
  contentType: "video" | "reel",
  index: number,
): string {
  return `${SERVICE_ID_PREFIX}${serviceSlug}:${contentType}:${index}`;
}

function parseServiceMediaId(id: string): {
  serviceSlug: string;
  contentType: "video" | "reel";
  index: number;
} | null {
  if (!id.startsWith(SERVICE_ID_PREFIX)) return null;
  const rest = id.slice(SERVICE_ID_PREFIX.length);
  const match = rest.match(/^(.+):(reel|video):(\d+)$/);
  if (!match) return null;
  return {
    serviceSlug: match[1],
    contentType: match[2] as "video" | "reel",
    index: Number(match[3]),
  };
}

function absolutizeMediaUrl(url: string): string {
  const t = url.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  const site = SITE_URL.replace(/\/$/, "");
  return `${site}${t.startsWith("/") ? t : `/${t}`}`;
}

export function parseGalleryMediaDoc(
  id: string,
  data: Record<string, unknown>,
): GalleryMediaRow | null {
  const type = String(data.type ?? "image").toLowerCase();
  if (type !== "video") return null;

  const mediaUrl = absolutizeMediaUrl(String(data.mediaUrl ?? data.imageUrl ?? ""));
  if (!mediaUrl) return null;

  const category = normalizeGalleryCategory(data.category);
  const isReel = category === "reels";
  const posterRaw = String(data.posterUrl ?? "").trim();
  const posterUrl = posterRaw ? absolutizeMediaUrl(posterRaw) : undefined;

  return {
    id,
    title: String(data.alt ?? "Book Scuba Goa video").trim() || "Book Scuba Goa video",
    mediaUrl,
    posterUrl,
    category,
    contentType: isReel ? "reel" : "video",
    sortOrder: Number(data.sortOrder ?? 0),
    source: "gallery",
  };
}

function rowsFromServices(
  kind: "video" | "reel" | "all",
): Promise<GalleryMediaRow[]> {
  return getAllServicesServer().then((services) => {
    const rows: GalleryMediaRow[] = [];
    for (const service of services) {
      const baseOrder = (service.sortOrder ?? 999) * 100;
      const poster = service.image ? absolutizeMediaUrl(service.image) : undefined;

      const reels = service.serviceMedia?.reels ?? [];
      reels.forEach((raw, index) => {
        const mediaUrl = absolutizeMediaUrl(raw);
        if (!mediaUrl) return;
        if (kind !== "all" && kind !== "reel") return;
        rows.push({
          id: buildServiceMediaId(service.slug, "reel", index),
          title: `${service.title} — Reel ${index + 1}`,
          mediaUrl,
          posterUrl: poster,
          category: "reels",
          contentType: "reel",
          sortOrder: baseOrder + index,
          source: "service",
          serviceSlug: service.slug,
        });
      });

      const videos = service.serviceMedia?.videos ?? [];
      videos.forEach((raw, index) => {
        const mediaUrl = absolutizeMediaUrl(raw);
        if (!mediaUrl) return;
        if (kind !== "all" && kind !== "video") return;
        rows.push({
          id: buildServiceMediaId(service.slug, "video", index),
          title: `${service.title} — Video ${index + 1}`,
          mediaUrl,
          posterUrl: poster,
          category: "customer-videos",
          contentType: "video",
          sortOrder: baseOrder + 50 + index,
          source: "service",
          serviceSlug: service.slug,
        });
      });
    }
    return rows;
  });
}

async function rowsFromHomeGallery(
  kind: "video" | "reel" | "all",
): Promise<GalleryMediaRow[]> {
  const db = getAdminDb();
  if (!db) return [];

  const snap = await db.collection("homeGallery").get();
  return snap.docs
    .map((doc) => parseGalleryMediaDoc(doc.id, doc.data() as Record<string, unknown>))
    .filter((r): r is GalleryMediaRow => r != null)
    .filter((r) => kind === "all" || r.contentType === kind);
}

export function galleryToSocialPayload(row: GalleryMediaRow): SocialContentPayload {
  const site = SITE_URL.replace(/\/$/, "");
  const isReel = row.contentType === "reel";
  const serviceUrl = row.serviceSlug ? `${site}/services/${row.serviceSlug}` : `${site}/gallery`;

  return {
    contentType: row.contentType,
    slug: row.id,
    title: row.title,
    excerpt: row.serviceSlug
      ? `${row.title} — Book Scuba Goa ${isReel ? "reel" : "video"} from our ${row.serviceSlug.replace(/-/g, " ")} experience in Baga, Goa.`
      : isReel
        ? "Real Goa vibes — scuba & water sports from Baga. Watch, save & book your slot."
        : "Customer moments from Book Scuba Goa — scuba diving & adventures in North Goa.",
    url: serviceUrl,
    imageUrl: row.posterUrl,
    videoUrl: row.mediaUrl,
    isReel,
  };
}

export async function listGalleryMediaForSocial(
  kind: "video" | "reel" | "all" = "all",
): Promise<GalleryMediaRow[]> {
  const [galleryRows, serviceRows] = await Promise.all([
    rowsFromHomeGallery(kind),
    rowsFromServices(kind),
  ]);

  const rows = [...serviceRows, ...galleryRows];
  rows.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  return rows;
}

export async function getGalleryMediaById(id: string): Promise<GalleryMediaRow | null> {
  const parsed = parseServiceMediaId(id);
  if (parsed) {
    const services = await getAllServicesServer();
    const service = services.find((s) => s.slug === parsed.serviceSlug);
    if (!service) return null;

    const list =
      parsed.contentType === "reel"
        ? service.serviceMedia?.reels ?? []
        : service.serviceMedia?.videos ?? [];
    const raw = list[parsed.index];
    if (!raw) return null;

    const mediaUrl = absolutizeMediaUrl(raw);
    if (!mediaUrl) return null;

    const poster = service.image ? absolutizeMediaUrl(service.image) : undefined;
    const label = parsed.contentType === "reel" ? "Reel" : "Video";

    return {
      id,
      title: `${service.title} — ${label} ${parsed.index + 1}`,
      mediaUrl,
      posterUrl: poster,
      category: parsed.contentType === "reel" ? "reels" : "customer-videos",
      contentType: parsed.contentType,
      sortOrder: (service.sortOrder ?? 999) * 100 + parsed.index,
      source: "service",
      serviceSlug: service.slug,
    };
  }

  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection("homeGallery").doc(id).get();
  if (!snap.exists) return null;
  return parseGalleryMediaDoc(snap.id, snap.data() as Record<string, unknown>);
}
