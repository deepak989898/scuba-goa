"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { cachedCmsFetch } from "@/lib/cms-client-cache";
import { sanitizePackageImageUrl } from "@/lib/cms-image";
import type { PackageDoc } from "@/lib/types";
import { parseFirestoreIncludes } from "@/lib/parse-firestore-includes";
import { fallbackPackages } from "@/data/fallback-packages";

function stripStockFromPackages(list: PackageDoc[]): PackageDoc[] {
  return list.map((p) => ({
    ...p,
    imageUrl: sanitizePackageImageUrl(p.imageUrl),
  }));
}

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
    imageUrl: sanitizePackageImageUrl(imageRaw),
    category: data.category ? String(data.category) : undefined,
    isCombo: Boolean(data.isCombo),
    discountPct:
      data.discountPct !== undefined ? Number(data.discountPct) : undefined,
    limitedSlots: Boolean(data.limitedSlots),
    active: data.active !== false,
  };
}

type PackagesCache = { list: PackageDoc[]; fromFirestore: boolean };

async function loadPackages(): Promise<PackagesCache> {
  const db = getDb();
  if (!db) {
    return { list: stripStockFromPackages(fallbackPackages), fromFirestore: false };
  }

  let snap = await getDocs(collection(db, "packages"));
  if (snap.empty) {
    try {
      const seedRes = await fetch("/api/seed-catalog-if-empty", {
        method: "POST",
      });
      if (seedRes.ok) {
        snap = await getDocs(collection(db, "packages"));
      }
    } catch {
      /* offline or seed unavailable */
    }
  }
  if (snap.empty) {
    return { list: stripStockFromPackages(fallbackPackages), fromFirestore: false };
  }
  const list = snap.docs
    .map((d) => mapDoc(d.id, d.data() as Record<string, unknown>))
    .filter((p) => p.active !== false);
  list.sort((a, b) => a.price - b.price);
  if (list.length === 0) {
    return { list: stripStockFromPackages(fallbackPackages), fromFirestore: false };
  }
  return { list, fromFirestore: true };
}

export function usePackages() {
  const [packages, setPackages] = useState<PackageDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromFirestore, setFromFirestore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await cachedCmsFetch("packages", loadPackages);
        if (cancelled) return;
        setPackages(result.list);
        setFromFirestore(result.fromFirestore);
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
