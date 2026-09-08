"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  GOA_HOTEL_AREA_SUGGESTIONS,
  type HotelSort,
} from "@/lib/goa-hotels/filter";

type Props = {
  resultCount: number;
  catalogCount: number;
};

export function HotelSearchFilters({ resultCount, catalogCount }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState<HotelSort>(
    (searchParams.get("sort") as HotelSort) || "name",
  );
  const [min, setMin] = useState(searchParams.get("min") ?? "");
  const [max, setMax] = useState(searchParams.get("max") ?? "");

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setSort((searchParams.get("sort") as HotelSort) || "name");
    setMin(searchParams.get("min") ?? "");
    setMax(searchParams.get("max") ?? "");
  }, [searchParams]);

  function navigate(next: { q?: string; sort?: HotelSort; min?: string; max?: string }) {
    const params = new URLSearchParams();
    const qVal = (next.q ?? q).trim();
    const sortVal = next.sort ?? sort;
    const minVal = (next.min ?? min).trim();
    const maxVal = (next.max ?? max).trim();

    if (qVal) params.set("q", qVal);
    if (sortVal && sortVal !== "name") params.set("sort", sortVal);
    if (minVal) params.set("min", minVal);
    if (maxVal) params.set("max", maxVal);

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/hotels?${qs}` : "/hotels");
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({});
  }

  function clearFilters() {
    setQ("");
    setSort("name");
    setMin("");
    setMax("");
    startTransition(() => router.push("/hotels"));
  }

  const hasFilters =
    Boolean(q.trim()) ||
    sort !== "name" ||
    Boolean(min.trim()) ||
    Boolean(max.trim());

  return (
    <div className="mt-6 rounded-2xl border border-ocean-100 bg-ocean-50/40 p-4 sm:p-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <label className="block text-sm">
            <span className="font-medium text-ocean-800">Search hotel or area</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. Baga, Calangute, Panjim, hotel name…"
              className="mt-1 w-full rounded-xl border border-ocean-200 bg-white px-3 py-2.5 text-sm text-ocean-900 placeholder:text-ocean-400"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-ocean-800">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as HotelSort)}
              className="mt-1 w-full rounded-xl border border-ocean-200 bg-white px-3 py-2.5 text-sm text-ocean-900 lg:min-w-[10rem]"
            >
              <option value="name">Name (A–Z)</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-ocean-800">Min price (₹)</span>
            <input
              type="number"
              min={0}
              step={100}
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="2000"
              className="mt-1 w-full rounded-xl border border-ocean-200 bg-white px-3 py-2.5 text-sm text-ocean-900 lg:min-w-[7rem]"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-ocean-800">Max price (₹)</span>
            <input
              type="number"
              min={0}
              step={100}
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="10000"
              className="mt-1 w-full rounded-xl border border-ocean-200 bg-white px-3 py-2.5 text-sm text-ocean-900 lg:min-w-[7rem]"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-ocean-gradient px-5 py-2.5 text-sm font-bold text-white shadow disabled:opacity-60"
          >
            {pending ? "Searching…" : "Search & filter"}
          </button>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-ocean-200 bg-white px-4 py-2.5 text-sm font-semibold text-ocean-800 hover:border-ocean-300"
            >
              Clear all
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
          Popular areas
        </span>
        {GOA_HOTEL_AREA_SUGGESTIONS.map((area) => (
          <button
            key={area}
            type="button"
            onClick={() => {
              setQ(area);
              navigate({ q: area });
            }}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              q.toLowerCase() === area.toLowerCase()
                ? "border-cyan-600 bg-cyan-50 text-cyan-800"
                : "border-ocean-200 bg-white text-ocean-700 hover:border-ocean-300"
            }`}
          >
            {area}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-ocean-600">
        {hasFilters
          ? `Showing ${resultCount} matching hotel${resultCount === 1 ? "" : "s"}`
          : `${catalogCount} Goa hotels in catalog`}
        {hasFilters && catalogCount !== resultCount
          ? ` (filtered from ${catalogCount})`
          : ""}
      </p>
    </div>
  );
}
