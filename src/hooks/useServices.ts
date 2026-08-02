"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { cachedCmsFetch } from "@/lib/cms-client-cache";
import { sanitizeServiceImages } from "@/lib/cms-image";
import { docToService } from "@/lib/service-firestore";
import { fallbackServices, type ServiceItem } from "@/data/services";

function publicFallbackServices(): ServiceItem[] {
  return fallbackServices.map((s) => sanitizeServiceImages(s));
}

type ServicesCache = { list: ServiceItem[]; fromFirestore: boolean };

async function loadServices(): Promise<ServicesCache> {
  const db = getDb();
  if (!db) return { list: publicFallbackServices(), fromFirestore: false };

  let snap = await getDocs(collection(db, "services"));
  if (snap.empty) {
    try {
      const seedRes = await fetch("/api/seed-catalog-if-empty", {
        method: "POST",
      });
      if (seedRes.ok) {
        snap = await getDocs(collection(db, "services"));
      }
    } catch {
      /* offline or seed unavailable */
    }
  }
  if (snap.empty) {
    return { list: publicFallbackServices(), fromFirestore: false };
  }
  const list: ServiceItem[] = [];
  for (const d of snap.docs) {
    const s = docToService(d.id, d.data() as Record<string, unknown>);
    if (s && s.active !== false) list.push(sanitizeServiceImages(s));
  }
  list.sort(
    (a, b) =>
      (a.sortOrder ?? 999) - (b.sortOrder ?? 999) ||
      a.slug.localeCompare(b.slug),
  );
  if (list.length === 0) {
    return { list: publicFallbackServices(), fromFirestore: false };
  }
  return { list, fromFirestore: true };
}

export function useServices() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromFirestore, setFromFirestore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await cachedCmsFetch("services", loadServices);
        if (cancelled) return;
        setServices(result.list);
        setFromFirestore(result.fromFirestore);
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
