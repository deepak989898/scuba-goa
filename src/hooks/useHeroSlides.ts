"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import {
  SITE_IMAGE_PLACEHOLDER,
  sanitizePublicImageUrl,
} from "@/lib/cms-image";
import type { HeroSlide } from "@/lib/hero-slides-default";

/** Never show the site booking banner as a hero slide (causes refresh flash). */
function heroSafeSrc(url: string | undefined | null): string {
  const t = sanitizePublicImageUrl(url);
  if (!t) return "";
  if (t === SITE_IMAGE_PLACEHOLDER) return "";
  if (t.includes("booking-header")) return "";
  return t;
}

export function useHeroSlides() {
  /** Start empty — ocean background only until admin heroSlides load (no banner flash). */
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDb();
    if (!db) {
      setSlides([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "heroSlides"));
        if (cancelled) return;
        if (snap.empty) {
          setSlides([]);
        } else {
          const rows = snap.docs.map((d) => {
            const x = d.data() as Record<string, unknown>;
            const videoUrl = String(
              x.videoUrl ?? x.videoURL ?? x.video_url ?? "",
            ).trim();
            const videoThumbnailUrl = heroSafeSrc(
              String(x.videoThumbnailUrl ?? x.video_thumbnail_url ?? ""),
            );
            const bookingRaw = String(
              x.bookingOption ?? x.booking_option ?? "",
            ).trim();
            const src = heroSafeSrc(String(x.imageUrl ?? ""));
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
              src: r.src,
              alt: r.alt,
              videoUrl: r.videoUrl,
              videoThumbnailUrl: r.videoThumbnailUrl,
              useAmbientMusic: r.useAmbientMusic ? true : undefined,
              bookingOption: r.bookingOption,
            }));
          setSlides(list);
        }
      } catch {
        if (!cancelled) setSlides([]);
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
