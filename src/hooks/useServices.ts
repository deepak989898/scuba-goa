"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { sanitizeServiceImages } from "@/lib/cms-image";
import { docToService } from "@/lib/service-firestore";
import { fallbackServices, type ServiceItem } from "@/data/services";

function publicFallbackServices(): ServiceItem[] {
  return fallbackServices.map((s) => sanitizeServiceImages(s));
}

export function useServices() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromFirestore, setFromFirestore] = useState(false);

  useEffect(() => {
    const db = getDb();
    if (!db) {
      setServices(publicFallbackServices());
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let snap = await getDocs(collection(db, "services"));
        if (cancelled) return;
        if (snap.empty) {
          try {
            const seedRes = await fetch("/api/seed-catalog-if-empty", {
              method: "POST",
            });
            if (seedRes.ok && !cancelled) {
              snap = await getDocs(collection(db, "services"));
            }
          } catch {
            /* offline or seed unavailable */
          }
        }
        if (cancelled) return;
        if (snap.empty) {
          setServices(publicFallbackServices());
          setFromFirestore(false);
        } else {
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
            setServices(publicFallbackServices());
            setFromFirestore(false);
          } else {
            setServices(list);
            setFromFirestore(true);
          }
        }
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
