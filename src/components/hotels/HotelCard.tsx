import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { formatHotelPriceInr } from "@/lib/goa-hotels/format";
import { pickHotelHeroImage } from "@/lib/goa-hotels/images";
import type { GoaHotelDoc } from "@/lib/goa-hotels/types";

type Props = {
  hotel: GoaHotelDoc;
  searchQuery?: string;
};

export function HotelCard({ hotel, searchQuery }: Props) {
  const image = pickHotelHeroImage(hotel);
  const detailHref = `/hotels/${encodeURIComponent(hotel.slug)}${
    searchQuery ? `?${searchQuery}` : ""
  }`;

  return (
    <article className="overflow-hidden rounded-2xl border border-ocean-100 bg-white shadow-sm transition hover:shadow-md">
      <Link href={detailHref} className="block">
        <div className="relative aspect-[16/10] bg-ocean-50">
          {image ? (
            <CmsRemoteImage
              src={image}
              alt={hotel.name}
              fill
              className="object-cover"
              sizes="(max-width:768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ocean-400">
              No image
            </div>
          )}
          {hotel.starRating ? (
            <span className="absolute left-3 top-3 rounded-full bg-slate-900/75 px-2.5 py-1 text-xs font-semibold text-amber-300">
              {hotel.starRating}★
            </span>
          ) : null}
        </div>
        <div className="p-4">
          <h2 className="font-display text-lg font-bold text-ocean-900 line-clamp-2">
            {hotel.name}
          </h2>
          <p className="mt-1 text-sm text-ocean-600">{hotel.location}</p>
          <p className="mt-3 text-sm text-ocean-700">
            From{" "}
            <span className="font-bold text-ocean-900">
              {hotel.priceFrom > 0
                ? `${formatHotelPriceInr(hotel.priceFrom)} / night`
                : "rates updating"}
            </span>
          </p>
          <span className="mt-4 inline-flex text-sm font-semibold text-cyan-700">
            View rooms →
          </span>
        </div>
      </Link>
    </article>
  );
}
