"use client";

import { useEffect, useState } from "react";
import { HotelCard } from "@/components/hotels/HotelCard";
import type { TripjackHotelCatalogDoc } from "@/lib/tripjack-hotels/types";

export function HotelsCatalogBrowse() {
  const [hotels, setHotels] = useState<TripjackHotelCatalogDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/hotels/catalog-browse?limit=24");
        const data = await res.json();
        if (!cancelled) {
          setHotels(Array.isArray(data.hotels) ? data.hotels : []);
          if (!data.enabled) setNote("Hotels module is not enabled yet.");
          else if (!data.hotels?.length) setNote("No hotels in catalog yet. Admin can sync from TripJack.");
        }
      } catch {
        if (!cancelled) setNote("Could not load hotels.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="mt-4 text-sm text-ocean-600">Loading hotels…</p>;
  }

  if (!hotels.length) {
    return (
      <p className="mt-4 text-sm text-ocean-600">
        {note ?? "No hotels to show yet. Use search above once catalog is synced."}
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {hotels.map((h) => <HotelCard key={h.tjHotelId} hotel={h} />)}
    </div>
  );
}
