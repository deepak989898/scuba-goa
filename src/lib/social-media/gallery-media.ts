import { SITE_URL } from "@/lib/constants";
import { getAdminDb } from "@/lib/firebase-admin";
import { normalizeGalleryCategory } from "@/lib/gallery-categories";
import type { SocialContentPayload } from "@/lib/social-media/types";

export type GalleryMediaRow = {
  id: string;
  title: string;
  mediaUrl: string;
  posterUrl?: string;
  category?: string;
  contentType: "video" | "reel";
  sortOrder: number;
};

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
  };
}

export function galleryToSocialPayload(row: GalleryMediaRow): SocialContentPayload {
  const site = SITE_URL.replace(/\/$/, "");
  const isReel = row.contentType === "reel";

  return {
    contentType: row.contentType,
    slug: row.id,
    title: row.title,
    excerpt: isReel
      ? "Real Goa vibes — scuba & water sports from Baga. Watch, save & book your slot."
      : "Customer moments from Book Scuba Goa — scuba diving & adventures in North Goa.",
    url: `${site}/gallery`,
    imageUrl: row.posterUrl,
    videoUrl: row.mediaUrl,
    isReel,
  };
}

export async function listGalleryMediaForSocial(
  kind: "video" | "reel" | "all" = "all",
): Promise<GalleryMediaRow[]> {
  const db = getAdminDb();
  if (!db) return [];

  const snap = await db.collection("homeGallery").get();
  const rows = snap.docs
    .map((doc) => parseGalleryMediaDoc(doc.id, doc.data() as Record<string, unknown>))
    .filter((r): r is GalleryMediaRow => r != null)
    .filter((r) => kind === "all" || r.contentType === kind);

  rows.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  return rows;
}

export async function getGalleryMediaById(id: string): Promise<GalleryMediaRow | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection("homeGallery").doc(id).get();
  if (!snap.exists) return null;
  return parseGalleryMediaDoc(snap.id, snap.data() as Record<string, unknown>);
}
