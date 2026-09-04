"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HotelBookingProgress } from "@/components/hotels/HotelBookingProgress";
import { HotelCard } from "@/components/hotels/HotelCard";
import {
  hotelSessionGet,
  hotelSessionSet,
  HOTEL_SESSION_KEYS,
} from "@/lib/tripjack-hotels/session";
import type { HotelSearchRequest, TripjackHotelCatalogDoc } from "@/lib/tripjack-hotels/types";

export default function HotelResultsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hotels, setHotels] = useState<
    (TripjackHotelCatalogDoc & { displayPrice?: number; priceSource?: string })[]
  >([]);
  const [search, setSearch] = useState<HotelSearchRequest | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const req = hotelSessionGet<HotelSearchRequest>(HOTEL_SESSION_KEYS.searchRequest);
    if (!req) {
      router.replace("/hotels");
      return;
    }
    setSearch(req);

    (async () => {
      try {
        const res = await fetch("/api/hotels/listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...req, destination: "Goa" }),
        });
        const data = await res.json();
        if (!res.ok) {
          setNote(data.error ?? "Search failed");
          setHotels([]);
        } else {
          setHotels(Array.isArray(data.hotels) ? data.hotels : []);
          hotelSessionSet(HOTEL_SESSION_KEYS.listingResponse, data);
          if (data.liveError) setNote(data.liveError);
          else if (data.cachedFallback) setNote("Showing saved prices where live refresh failed.");
        }
      } catch {
        setNote("Could not search hotels. Try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <div className="bg-white py-5 sm:py-7">
      <div className="site-container">
        <HotelBookingProgress />
        <h1 className="font-display text-2xl font-bold text-ocean-900">Hotels in Goa</h1>
        {search && (
          <p className="mt-1 text-sm text-ocean-600">
            {search.checkIn} → {search.checkOut} · {search.rooms} room(s) · {search.adults} adult(s)
          </p>
        )}
        {note && <p className="mt-2 text-sm text-amber-700">{note}</p>}
        {loading ? (
          <p className="mt-6 text-ocean-600">Searching…</p>
        ) : hotels.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hotels.map((h) => (
              <HotelCard
                key={h.tjHotelId}
                hotel={h}
                checkIn={search?.checkIn}
                checkOut={search?.checkOut}
              />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-ocean-600">No hotels found. Try different dates or sync catalog.</p>
        )}
      </div>
    </div>
  );
}
