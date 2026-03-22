"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { PackageDoc } from "@/lib/types";
import { parseFirestoreIncludes } from "@/lib/parse-firestore-includes";
import { fallbackPackages } from "@/data/fallback-packages";

function mapDoc(id: string, data: Record<string, unknown>): PackageDoc {
  const imageRaw = data.imageUrl != null ? String(data.imageUrl).trim() : "";
  return {
    id,
    name: String(data.name ?? ""),
    price: Number(data.price ?? 0),
    duration: String(data.duration ?? ""),
    includes: parseFirestoreIncludes(data.includes),
    rating: Number(data.rating ?? 4.8),
    slotsLeft:
      data.slotsLeft !== undefined ? Number(data.slotsLeft) : undefined,
    bookedToday:
      data.bookedToday !== undefined ? Number(data.bookedToday) : undefined,
    imageUrl: imageRaw || undefined,
    category: data.category ? String(data.category) : undefined,
    isCombo: Boolean(data.isCombo),
    discountPct:
      data.discountPct !== undefined ? Number(data.discountPct) : undefined,
    limitedSlots: Boolean(data.limitedSlots),
    active: data.active !== false,
  };
}

export function usePackages() {
  const [packages, setPackages] = useState<PackageDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromFirestore, setFromFirestore] = useState(false);

  useEffect(() => {
    const db = getDb();
    if (!db) {
      setPackages(fallbackPackages);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "packages"));
        if (cancelled) return;
        if (snap.empty) {
          setPackages(fallbackPackages);
          setFromFirestore(false);
        } else {
          const list = snap.docs
            .map((d) => mapDoc(d.id, d.data() as Record<string, unknown>))
            .filter((p) => p.active !== false);
          list.sort((a, b) => a.price - b.price);
          if (list.length === 0) {
            setPackages(fallbackPackages);
            setFromFirestore(false);
          } else {
            setPackages(list);
            setFromFirestore(true);
          }
        }
      } catch {
        if (!cancelled) {
          setPackages(fallbackPackages);
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
