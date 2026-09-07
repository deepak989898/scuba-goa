"use client";

import { useEffect, useState } from "react";
import { fallbackServices, type ServiceItem } from "@/data/services";
import { sanitizeServiceImages } from "@/lib/cms-image";
import { getPublicCmsCatalogCached } from "@/hooks/usePublicCmsCatalog";

function publicFallbackServices(): ServiceItem[] {
  return fallbackServices.map((s) => sanitizeServiceImages(s));
}

export function useServices() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromFirestore, setFromFirestore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await getPublicCmsCatalogCached();
        if (cancelled) return;
        const list = catalog.services?.length
          ? catalog.services
          : publicFallbackServices();
        setServices(list);
        setFromFirestore(Boolean(catalog.fromFirestore && catalog.services?.length));
      } catch {
        if (!cancelled) {
          setServices(publicFallbackServices());
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

  return { services, loading, fromFirestore };
}
