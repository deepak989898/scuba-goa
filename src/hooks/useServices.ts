"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { docToService } from "@/lib/service-firestore";
import { fallbackServices, type ServiceItem } from "@/data/services";

export function useServices() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromFirestore, setFromFirestore] = useState(false);

  useEffect(() => {
    const db = getDb();
    if (!db) {
      setServices(fallbackServices);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "services"));
        if (cancelled) return;
        if (snap.empty) {
          setServices(fallbackServices);
          setFromFirestore(false);
        } else {
          const list: ServiceItem[] = [];
          for (const d of snap.docs) {
            const s = docToService(d.id, d.data() as Record<string, unknown>);
            if (s && s.active !== false) list.push(s);
          }
          list.sort(
            (a, b) =>
              (a.sortOrder ?? 999) - (b.sortOrder ?? 999) ||
              a.slug.localeCompare(b.slug)
          );
          setServices(list);
          setFromFirestore(true);
        }
      } catch {
        if (!cancelled) {
          setServices(fallbackServices);
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
