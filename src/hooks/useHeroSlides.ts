"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import {
  cmsImageOrPlaceholder,
  sanitizePublicImageUrl,
} from "@/lib/cms-image";
import type { HeroSlide } from "@/lib/hero-slides-default";

const PLACEHOLDER_HERO: HeroSlide[] = [
  {
    src: cmsImageOrPlaceholder(),
    alt: "Book Scuba Goa",
  },
];

function withHeroFallback(list: HeroSlide[]): HeroSlide[] {
  return list.length > 0 ? list : PLACEHOLDER_HERO;
}

export function useHeroSlides() {
  const [slides, setSlides] = useState<HeroSlide[]>(PLACEHOLDER_HERO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDb();
    if (!db) {
      setSlides(PLACEHOLDER_HERO);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "heroSlides"));
        if (cancelled) return;
        if (snap.empty) {
          setSlides(PLACEHOLDER_HERO);
        } else {
          const rows = snap.docs.map((d) => {
            const x = d.data() as Record<string, unknown>;
            const videoUrl = String(
              x.videoUrl ?? x.videoURL ?? x.video_url ?? "",
            ).trim();
            const videoThumbnailUrl = sanitizePublicImageUrl(
              String(x.videoThumbnailUrl ?? x.video_thumbnail_url ?? ""),
            );
            const bookingRaw = String(
              x.bookingOption ?? x.booking_option ?? "",
            ).trim();
            const src = sanitizePublicImageUrl(String(x.imageUrl ?? ""));
            return {
              id: d.id,
              src,
              alt: String(x.alt ?? "Hero image").trim() || "Hero image",
              sortOrder: Number(x.sortOrder ?? 0),
              videoUrl: videoUrl.length > 0 ? videoUrl : undefined,
              videoThumbnailUrl: videoThumbnailUrl || undefined,
              useAmbientMusic: Boolean(x.useAmbientMusic),
              bookingOption: bookingRaw.length > 0 ? bookingRaw : undefined,
            };
          });
          rows.sort(
            (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
          );
          const list: HeroSlide[] = rows
            .filter((r) => r.src.length > 0 || r.videoUrl)
            .map((r) => ({
              src: r.src.length > 0 ? r.src : cmsImageOrPlaceholder(),
              alt: r.alt,
              videoUrl: r.videoUrl,
              videoThumbnailUrl: r.videoThumbnailUrl,
              useAmbientMusic: r.useAmbientMusic ? true : undefined,
              bookingOption: r.bookingOption,
            }));
          setSlides(withHeroFallback(list));
        }
      } catch {
        if (!cancelled) setSlides(PLACEHOLDER_HERO);
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
