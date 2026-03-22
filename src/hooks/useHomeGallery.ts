"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import {
  DEFAULT_HOME_GALLERY,
  type HomeGalleryItem,
} from "@/lib/home-gallery-default";

function normalizeRow(
  id: string,
  x: Record<string, unknown>
): (HomeGalleryItem & { sortOrder: number; id: string }) | null {
  const typeRaw = String(x.type ?? "image").toLowerCase();
  const type: "image" | "video" = typeRaw === "video" ? "video" : "image";
  const mediaUrl = String(x.mediaUrl ?? x.imageUrl ?? "").trim();
  if (!mediaUrl) return null;
  const posterUrl = String(x.posterUrl ?? "").trim() || undefined;
  const alt = String(x.alt ?? "Gallery").trim() || "Gallery";
  const sortOrder = Number(x.sortOrder ?? 0);
  return { id, type, mediaUrl, posterUrl, alt, sortOrder };
}

export function useHomeGallery() {
  const [items, setItems] = useState<HomeGalleryItem[]>(DEFAULT_HOME_GALLERY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDb();
    if (!db) {
      setItems(DEFAULT_HOME_GALLERY);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "homeGallery"));
        if (cancelled) return;
        if (snap.empty) {
          setItems(DEFAULT_HOME_GALLERY);
        } else {
          const rows = snap.docs
            .map((docSnap) =>
              normalizeRow(docSnap.id, docSnap.data() as Record<string, unknown>)
            )
            .filter((r): r is NonNullable<typeof r> => r != null);
          rows.sort(
            (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
          );
          const list: HomeGalleryItem[] = rows.map(
            ({ type, mediaUrl, posterUrl, alt }) => ({
              type,
              mediaUrl,
              posterUrl,
              alt,
            })
          );
          setItems(list.length ? list : DEFAULT_HOME_GALLERY);
        }
      } catch {
        if (!cancelled) setItems(DEFAULT_HOME_GALLERY);
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
