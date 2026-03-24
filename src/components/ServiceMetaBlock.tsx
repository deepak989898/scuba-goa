import type { ServiceItem } from "@/data/services";
import { getAggregatedServiceSlots } from "@/lib/service-slot-totals";

/** Package-style detail row used on service cards & grids */
export function ServiceMetaBlock({ s }: { s: ServiceItem }) {
  const { slotsLeft, bookedToday, fromSubServices } =
    getAggregatedServiceSlots(s);

  return (
    <div className="mt-1.5 space-y-1 sm:mt-2 sm:space-y-2">
      <p className="text-xs text-ocean-600 sm:text-sm">{s.duration}</p>
      <p className="text-xs font-medium text-amber-700 sm:text-sm">
        ⭐ {s.rating.toFixed(1)} rated
      </p>
      <ul className="flex flex-wrap gap-1 sm:gap-1.5">
        {s.includes.map((inc, i) => (
          <li
            key={`${s.slug}-inc-${i}`}
            className="rounded-full bg-ocean-50 px-1.5 py-0.5 text-[10px] text-ocean-800 sm:px-2 sm:text-xs"
          >
            {inc}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-0.5 text-[10px] text-ocean-600 sm:text-xs">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {slotsLeft != null ? (
            <span className="font-semibold text-red-600">
              {slotsLeft} slots left
              {fromSubServices ? " (total)" : ""}
            </span>
          ) : null}
          {bookedToday != null ? (
            <span>
              {bookedToday} booked today
              {fromSubServices ? " (total)" : ""}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
