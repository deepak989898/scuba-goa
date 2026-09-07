"use client";

import { useEffect, useState } from "react";
import type { HeroSlide } from "@/lib/hero-slides-default";
import { getPublicCmsCatalogCached } from "@/hooks/usePublicCmsCatalog";

export function useHeroSlides() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await getPublicCmsCatalogCached();
        if (!cancelled) setSlides(catalog.heroSlides ?? []);
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
