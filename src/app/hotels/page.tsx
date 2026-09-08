import type { Metadata } from "next";
import { Suspense } from "react";
import { HotelCard } from "@/components/hotels/HotelCard";
import { HotelSearchFilters } from "@/components/hotels/HotelSearchFilters";
import { ListPagination } from "@/components/ListPagination";
import { GOA_HOTELS_LIST_CAP, listGoaHotels } from "@/lib/goa-hotels/firestore";
import {
  filterAndSortHotels,
  HOTELS_PAGE_SIZE,
  hotelsListQueryParams,
  parseHotelSort,
  parsePriceFilter,
} from "@/lib/goa-hotels/filter";
import { getPageSlice } from "@/lib/list-pagination";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

type Props = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: string;
    min?: string;
    max?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Goa hotels",
  description: `Book Goa hotels online with ${SITE_NAME}. Browse curated stays with photos, facilities, and Razorpay checkout.`,
  alternates: {
    canonical: `${SITE_URL.replace(/\/$/, "")}/hotels`,
  },
};

export default async function HotelsPage({ searchParams }: Props) {
  const params = await searchParams;
  const { page: pageRaw, q, sort: sortRaw, min, max } = params;

  const allHotels = await listGoaHotels(GOA_HOTELS_LIST_CAP);
  const filtered = filterAndSortHotels(allHotels, {
    q,
    sort: parseHotelSort(sortRaw),
    minPrice: parsePriceFilter(min),
    maxPrice: parsePriceFilter(max),
  });

  const slice = getPageSlice(filtered.length, pageRaw, HOTELS_PAGE_SIZE);
  const pageHotels = filtered.slice(slice.start, slice.end);
  const paginationQuery = hotelsListQueryParams({
    q,
    sort: parseHotelSort(sortRaw),
    min,
    max,
  });

  return (
    <div className="bg-white py-10 sm:py-14">
      <div className="site-container">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
          Goa stays
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ocean-900 sm:text-4xl">
          Hotels in Goa
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ocean-700">
          Curated Goa hotels with live rates from our partner catalog. Search by hotel name or
          area (Baga, Calangute, Panjim), filter by price, and pay securely with Razorpay.
        </p>

        {allHotels.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-ocean-200 bg-ocean-50/50 p-8 text-sm text-ocean-700">
            No hotels loaded yet. If you just added{" "}
            <code className="text-xs">SAFAR_SATHI_FIREBASE_SERVICE_ACCOUNT_KEY</code> on Vercel,
            redeploy and wait a few minutes. Safar Sathi must have documents in{" "}
            <code className="text-xs">goaHotels</code> with{" "}
            <code className="text-xs">sharedFor: bookscubagoa</code>. Check{" "}
            <code className="text-xs">/api/hotels/catalog-health</code> after deploy.
          </p>
        ) : (
          <>
            <Suspense fallback={null}>
              <HotelSearchFilters
                resultCount={filtered.length}
                catalogCount={allHotels.length}
              />
            </Suspense>

            {filtered.length === 0 ? (
              <p className="mt-8 rounded-2xl border border-dashed border-ocean-200 bg-ocean-50/50 p-8 text-sm text-ocean-700">
                No hotels match your search. Try another area name or adjust the price range.
              </p>
            ) : (
              <>
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {pageHotels.map((hotel) => (
                    <HotelCard key={hotel.id} hotel={hotel} />
                  ))}
                </div>
                <ListPagination
                  basePath="/hotels"
                  page={slice.page}
                  totalPages={slice.totalPages}
                  totalItems={slice.totalItems}
                  start={slice.start}
                  end={slice.end}
                  itemLabel="hotels"
                  queryParams={paginationQuery}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
