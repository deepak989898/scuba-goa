"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { cachedCmsFetch } from "@/lib/cms-client-cache";
import { sanitizePublicImageUrl } from "@/lib/cms-image";
import { fetchStockBlogSlugSet } from "@/lib/gallery-blog-stock-lookup";
import { filterPublicGalleryItems } from "@/lib/gallery-stock-filter";
import { normalizeGalleryCategory } from "@/lib/gallery-categories";
import { dedupeHomeGalleryItems } from "@/lib/home-gallery-dedupe";
import {
  DEFAULT_HOME_GALLERY,
  type HomeGalleryItem,
} from "@/lib/home-gallery-default";

function normalizeRow(
  id: string,
  x: Record<string, unknown>,
): (HomeGalleryItem & { sortOrder: number; id: string }) | null {
  const typeRaw = String(x.type ?? "image").toLowerCase();
  const type: "image" | "video" = typeRaw === "video" ? "video" : "image";
  const mediaUrl = sanitizePublicImageUrl(
    String(x.mediaUrl ?? x.imageUrl ?? ""),
  );
  if (!mediaUrl && type === "image") return null;
  const rawMedia = String(x.mediaUrl ?? x.imageUrl ?? "").trim();
  const resolvedMedia =
    type === "video" ? rawMedia || mediaUrl : mediaUrl;
  if (!resolvedMedia) return null;
  const posterUrl =
    sanitizePublicImageUrl(String(x.posterUrl ?? "")) || undefined;
  const alt = String(x.alt ?? "Gallery").trim() || "Gallery";
  const sortOrder = Number(x.sortOrder ?? 0);
  const category = normalizeGalleryCategory(x.category);
  const source = String(x.source ?? "").trim() || undefined;
  const sourceSlug = String(x.sourceSlug ?? "").trim() || undefined;
  const imageSource = String(x.imageSource ?? "").trim() || undefined;
  const editorialImage = x.editorialImage === true ? true : undefined;
  const sha256 = String(x.sha256 ?? "").trim() || undefined;
  const perceptualHash = String(x.perceptualHash ?? "").trim() || undefined;
  return {
    id,
    type,
    mediaUrl: resolvedMedia,
    posterUrl,
    alt,
    sortOrder,
    category,
    source,
    sourceSlug,
    imageSource,
    editorialImage,
    sha256,
    perceptualHash,
  };
}

async function loadPublicGalleryItems(): Promise<HomeGalleryItem[]> {
  const db = getDb();
  if (!db) return dedupeHomeGalleryItems(DEFAULT_HOME_GALLERY);

  const snap = await getDocs(collection(db, "homeGallery"));
  if (snap.empty) return dedupeHomeGalleryItems(DEFAULT_HOME_GALLERY);

  const rows = snap.docs
    .map((docSnap) =>
      normalizeRow(docSnap.id, docSnap.data() as Record<string, unknown>),
    )
    .filter((r): r is NonNullable<typeof r> => r != null);
  rows.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));

  const mapped = rows.map(
    ({
      type,
      mediaUrl,
      posterUrl,
      alt,
      category,
      source,
      sourceSlug,
      imageSource,
      editorialImage,
      sha256,
      perceptualHash,
    }) => ({
      type,
      mediaUrl,
      posterUrl,
      alt,
      category,
      source,
      sourceSlug,
      imageSource,
      editorialImage,
      sha256,
      perceptualHash,
    }),
  );

  const deduped = dedupeHomeGalleryItems(mapped);
  const blogSlugs = deduped
    .filter((i) => i.source === "blog" && i.sourceSlug)
    .map((i) => i.sourceSlug as string);
  const stockSlugs =
    blogSlugs.length > 0 ? await fetchStockBlogSlugSet(db, blogSlugs) : new Set<string>();

  return filterPublicGalleryItems(deduped, stockSlugs);
}

export function useHomeGallery() {
  const [items, setItems] = useState<HomeGalleryItem[]>(
    () => dedupeHomeGalleryItems(DEFAULT_HOME_GALLERY),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await cachedCmsFetch("homeGalleryPublic", loadPublicGalleryItems);
        if (!cancelled) setItems(list);
      } catch {
        if (!cancelled) setItems(dedupeHomeGalleryItems(DEFAULT_HOME_GALLERY));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading };
}
