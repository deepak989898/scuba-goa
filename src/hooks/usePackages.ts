"use client";

import { useEffect, useState } from "react";
import { sanitizePackageImageUrl } from "@/lib/cms-image";
import type { PackageDoc } from "@/lib/types";
import { fallbackPackages } from "@/data/fallback-packages";
import { getPublicCmsCatalogCached } from "@/hooks/usePublicCmsCatalog";

function stripStockFromPackages(list: PackageDoc[]): PackageDoc[] {
  return list.map((p) => ({
    ...p,
    imageUrl: sanitizePackageImageUrl(p.imageUrl),
  }));
}

export function usePackages() {
  const [packages, setPackages] = useState<PackageDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromFirestore, setFromFirestore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await getPublicCmsCatalogCached();
        if (cancelled) return;
        const list = catalog.packages?.length
          ? catalog.packages
          : stripStockFromPackages(fallbackPackages);
        setPackages(list);
        setFromFirestore(Boolean(catalog.fromFirestore && catalog.packages?.length));
      } catch {
        if (!cancelled) {
          setPackages(stripStockFromPackages(fallbackPackages));
          setFromFirestore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { packages, loading, fromFirestore };
}
