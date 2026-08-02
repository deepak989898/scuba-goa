"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { sanitizePublicImageUrl } from "@/lib/cms-image";
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
  // Videos may use non-image hosts; keep video URL if present
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
    sha256,
    perceptualHash,
  };
}

export function useHomeGallery() {
  const [items, setItems] = useState<HomeGalleryItem[]>(
    () => dedupeHomeGalleryItems(DEFAULT_HOME_GALLERY),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDb();
    if (!db) {
      setItems(dedupeHomeGalleryItems(DEFAULT_HOME_GALLERY));
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "homeGallery"));
        if (cancelled) return;
        if (snap.empty) {
          setItems(dedupeHomeGalleryItems(DEFAULT_HOME_GALLERY));
        } else {
          const rows = snap.docs
            .map((docSnap) =>
              normalizeRow(
                docSnap.id,
                docSnap.data() as Record<string, unknown>,
              ),
            )
            .filter((r): r is NonNullable<typeof r> => r != null);
          rows.sort(
            (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
          );
          const list: HomeGalleryItem[] = dedupeHomeGalleryItems(
            rows.map(
              ({
                type,
                mediaUrl,
                posterUrl,
                alt,
                category,
                source,
                sourceSlug,
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
                sha256,
                perceptualHash,
              }),
            ),
          );
          setItems(list);
        }
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
