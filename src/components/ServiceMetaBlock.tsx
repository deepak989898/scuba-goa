import type { ServiceItem } from "@/data/services";

/** Package-style detail row used on service cards & grids */
export function ServiceMetaBlock({ s }: { s: ServiceItem }) {
  return (
    <div className="mt-2 space-y-2">
      <p className="text-sm text-ocean-600">{s.duration}</p>
      <p className="text-sm font-medium text-amber-700">
        ⭐ {s.rating.toFixed(1)} rated
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {s.includes.slice(0, 4).map((inc) => (
          <li
            key={inc}
            className="rounded-full bg-ocean-50 px-2 py-0.5 text-xs text-ocean-800"
          >
            {inc}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 text-xs text-ocean-600">
        {s.slotsLeft != null ? (
          <span className="font-semibold text-red-600">
            Only {s.slotsLeft} slots left
          </span>
        ) : null}
        {s.bookedToday != null ? (
          <span>Booked {s.bookedToday} times today</span>
        ) : null}
      </div>
    </div>
  );
}
