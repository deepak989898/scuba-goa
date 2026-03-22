import type { ServiceItem } from "@/data/services";
import { getAggregatedServiceSlots } from "@/lib/service-slot-totals";

/** Package-style detail row used on service cards & grids */
export function ServiceMetaBlock({ s }: { s: ServiceItem }) {
  const { slotsLeft, bookedToday, fromSubServices } =
    getAggregatedServiceSlots(s);

  return (
    <div className="mt-2 space-y-2">
      <p className="text-sm text-ocean-600">{s.duration}</p>
      <p className="text-sm font-medium text-amber-700">
        ⭐ {s.rating.toFixed(1)} rated
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {s.includes.map((inc, i) => (
          <li
            key={`${s.slug}-inc-${i}`}
            className="rounded-full bg-ocean-50 px-2 py-0.5 text-xs text-ocean-800"
          >
            {inc}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-0.5 text-xs text-ocean-600">
        <div className="flex flex-wrap gap-2">
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
