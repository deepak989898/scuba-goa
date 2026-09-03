"use client";

import Image from "next/image";
import Link from "next/link";
import { formatHotelPriceInr } from "@/lib/tripjack-hotels/format";
import type { TripjackHotelCatalogDoc } from "@/lib/tripjack-hotels/types";

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80";

type Props = {
  hotel: TripjackHotelCatalogDoc & {
    displayPrice?: number;
    priceSource?: string;
  };
  checkIn?: string;
  checkOut?: string;
  href?: string;
};

export function HotelCard({ hotel, checkIn, checkOut, href }: Props) {
  const img = hotel.images?.[0] ?? PLACEHOLDER;
  const price = hotel.displayPrice ?? hotel.priceFrom;
  const link =
    href ??
    `/hotels/detail/${encodeURIComponent(hotel.tjHotelId)}${
      checkIn && checkOut
        ? `?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`
        : ""
    }`;

  return (
    <Link
      href={link}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ocean-100 bg-white shadow-sm transition hover:border-ocean-200 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] bg-ocean-50">
        <Image
          src={img}
          alt={hotel.name}
          fill
          className="object-cover transition group-hover:scale-[1.02]"
          sizes="(max-width: 768px) 100vw, 33vw"
          unoptimized={img.startsWith("http")}
        />
        {hotel.starRating && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold text-ocean-800">
            {hotel.starRating}★
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-bold text-ocean-900 line-clamp-2">
          {hotel.name}
        </h3>
        <p className="mt-1 text-sm text-ocean-600">
          {hotel.locality ? `${hotel.locality}, Goa` : "Goa, India"}
        </p>
        <div className="mt-3 flex items-end justify-between gap-2">
          {price ? (
            <div>
              <p className="text-xs text-ocean-500">From</p>
              <p className="text-lg font-bold text-ocean-900">
                {formatHotelPriceInr(price, hotel.priceCurrency ?? "INR")}
              </p>
              <p className="text-[11px] text-ocean-500">incl. taxes</p>
            </div>
          ) : (
            <p className="text-sm text-ocean-500">Price on request</p>
          )}
          <span className="rounded-full bg-ocean-gradient px-3 py-1 text-xs font-semibold text-white">
            View rooms
          </span>
        </div>
      </div>
    </Link>
  );
}
