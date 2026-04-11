"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import {
  DEFAULT_HERO_SLIDES,
  type HeroSlide,
} from "@/lib/hero-slides-default";

export function useHeroSlides() {
  /** Start empty so the built-in defaults never flash before Firestore responds. */
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDb();
    if (!db) {
      setSlides(DEFAULT_HERO_SLIDES);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "heroSlides"));
        if (cancelled) return;
        if (snap.empty) {
          setSlides(DEFAULT_HERO_SLIDES);
        } else {
          const rows = snap.docs.map((d) => {
            const x = d.data() as Record<string, unknown>;
            const videoUrl = String(
              x.videoUrl ?? x.videoURL ?? x.video_url ?? "",
            ).trim();
            const videoThumbnailUrl = String(
              x.videoThumbnailUrl ?? x.video_thumbnail_url ?? "",
            ).trim();
            const bookingRaw = String(
              x.bookingOption ?? x.booking_option ?? "",
            ).trim();
            return {
              id: d.id,
              src: String(x.imageUrl ?? "").trim(),
              alt: String(x.alt ?? "Hero image").trim() || "Hero image",
              sortOrder: Number(x.sortOrder ?? 0),
              videoUrl: videoUrl.length > 0 ? videoUrl : undefined,
              videoThumbnailUrl:
                videoThumbnailUrl.length > 0 ? videoThumbnailUrl : undefined,
              useAmbientMusic: Boolean(x.useAmbientMusic),
              bookingOption: bookingRaw.length > 0 ? bookingRaw : undefined,
            };
          });
          rows.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
          const list: HeroSlide[] = rows
            .filter((r) => r.src.length > 0 || r.videoUrl)
            .map((r) => ({
              src:
                r.src.length > 0
                  ? r.src
                  : "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1920&q=80",
              alt: r.alt,
              videoUrl: r.videoUrl,
              videoThumbnailUrl: r.videoThumbnailUrl,
              useAmbientMusic: r.useAmbientMusic ? true : undefined,
              bookingOption: r.bookingOption,
            }));
          setSlides(list.length ? list : DEFAULT_HERO_SLIDES);
        }
      } catch {
        if (!cancelled) setSlides(DEFAULT_HERO_SLIDES);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { slides, loading };
}
