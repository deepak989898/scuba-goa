"use client";

import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { HotelBookingProgress } from "@/components/hotels/HotelBookingProgress";
import { formatHotelPriceInr } from "@/lib/tripjack-hotels/format";
import {
  hotelSessionGet,
  hotelSessionSet,
  HOTEL_SESSION_KEYS,
} from "@/lib/tripjack-hotels/session";
import type { HotelRoomOption, HotelSearchRequest } from "@/lib/tripjack-hotels/types";

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80";

export default function HotelDetailClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hid = String(params.hid ?? "");

  const [loading, setLoading] = useState(true);
  const [hotelName, setHotelName] = useState("");
  const [locality, setLocality] = useState<string | undefined>();
  const [images, setImages] = useState<string[]>([]);
  const [options, setOptions] = useState<HotelRoomOption[]>([]);
  const [search, setSearch] = useState<HotelSearchRequest | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const sessionSearch = hotelSessionGet<HotelSearchRequest>(HOTEL_SESSION_KEYS.searchRequest);
    const checkIn = searchParams.get("checkIn") ?? sessionSearch?.checkIn;
    const checkOut = searchParams.get("checkOut") ?? sessionSearch?.checkOut;
    if (!checkIn || !checkOut) {
      router.replace("/hotels");
      return;
    }
    const req: HotelSearchRequest = {
      checkIn,
      checkOut,
      rooms: sessionSearch?.rooms ?? 1,
      adults: sessionSearch?.adults ?? 2,
      children: sessionSearch?.children ?? 0,
    };
    setSearch(req);
    hotelSessionSet(HOTEL_SESSION_KEYS.searchRequest, req);
    hotelSessionSet(HOTEL_SESSION_KEYS.selectedId, hid);

    (async () => {
      try {
        const [detailRes, pricingRes] = await Promise.all([
          fetch("/api/hotels/detail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hid, destination: "Goa" }),
          }),
          fetch("/api/hotels/pricing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...req, hid, destination: "Goa" }),
          }),
        ]);
        const detail = await detailRes.json();
        const pricing = await pricingRes.json();
        const cat = detail.catalog ?? pricing.catalog;
        setHotelName(String(cat?.name ?? "Hotel"));
        setLocality(cat?.locality);
        setImages(Array.isArray(cat?.images) ? cat.images : []);
        setOptions(Array.isArray(pricing.options) ? pricing.options : []);
        if (pricing.pricingError) setNote(pricing.pricingError);
      } catch {
        setNote("Could not load hotel details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [hid, router, searchParams]);

  function selectRoom(opt: HotelRoomOption) {
    hotelSessionSet(HOTEL_SESSION_KEYS.selectedOption, {
      hid,
      hotelName,
      locality,
      option: opt,
      search,
    });
    router.push("/hotels/guests");
  }

  const hero = images[0] ?? PLACEHOLDER;

  return (
    <div className="bg-white py-5 sm:py-7">
      <div className="site-container">
        <HotelBookingProgress />
        {loading ? (
          <p className="text-ocean-600">Loading hotel…</p>
        ) : (
          <>
            <div className="relative mb-6 aspect-[21/9] overflow-hidden rounded-2xl bg-ocean-50">
              <Image
                src={hero}
                alt={hotelName}
                fill
                className="object-cover"
                sizes="100vw"
              />
            </div>
            <h1 className="font-display text-2xl font-bold text-ocean-900">{hotelName}</h1>
            <p className="text-sm text-ocean-600">
              {locality ? `${locality}, Goa` : "Goa, India"}
              {search && ` · ${search.checkIn} → ${search.checkOut}`}
            </p>
            {note && <p className="mt-2 text-sm text-amber-700">{note}</p>}
            <h2 className="mt-8 font-display text-xl font-bold text-ocean-900">Choose a room</h2>
            <div className="mt-4 space-y-3">
              {options.length ? (
                options.map((opt) => (
                  <div
                    key={opt.optionId}
                    className="flex flex-col gap-3 rounded-2xl border border-ocean-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-ocean-900">{opt.roomName}</p>
                      {opt.mealBasis && (
                        <p className="text-sm text-ocean-600">Meal: {opt.mealBasis}</p>
                      )}
                      {opt.cancellationText && (
                        <p className="mt-1 text-xs text-ocean-500">{opt.cancellationText}</p>
                      )}
                      <p className="mt-1 text-xs text-ocean-500">
                        {opt.refundable ? "Refundable" : "Non-refundable"} · incl. taxes
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-bold text-ocean-900">
                        {formatHotelPriceInr(opt.totalFare, opt.currency)}
                      </p>
                      <button
                        type="button"
                        onClick={() => selectRoom(opt)}
                        className="rounded-full bg-ocean-gradient px-4 py-2 text-sm font-semibold text-white"
                      >
                        Select
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-ocean-600">No rooms available for these dates.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
