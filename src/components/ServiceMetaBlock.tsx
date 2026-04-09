import type { ServiceItem } from "@/data/services";
import { getAggregatedServiceSlots } from "@/lib/service-slot-totals";

type Variant = "default" | "cardGrid";

/** Package-style detail row used on service cards & grids */
export function ServiceMetaBlock({
  s,
  variant = "default",
}: {
  s: ServiceItem;
  variant?: Variant;
}) {
  const { slotsLeft, bookedToday, fromSubServices } =
    getAggregatedServiceSlots(s);

  const includesList = (
    <ul
      className={
        variant === "cardGrid"
          ? "flex flex-wrap content-start gap-1 sm:gap-1.5"
          : "flex flex-wrap gap-1 sm:gap-1.5"
      }
    >
      {s.includes.map((inc, i) => (
        <li
          key={`${s.slug}-inc-${i}`}
          title={inc}
          className={
            variant === "cardGrid"
              ? "min-w-0 max-w-[min(100%,8.75rem)] shrink-0 truncate rounded-full bg-ocean-50 px-1.5 py-0.5 text-left text-[10px] text-ocean-800 sm:max-w-[min(100%,11rem)] sm:px-2 sm:text-xs"
              : "rounded-full bg-ocean-50 px-1.5 py-0.5 text-[10px] text-ocean-800 sm:px-2 sm:text-xs"
          }
        >
          {inc}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="mt-1.5 space-y-1 sm:mt-2 sm:space-y-2">
      <p className="text-xs text-ocean-600 sm:text-sm">{s.duration}</p>
      <p className="text-xs font-medium text-amber-700 sm:text-sm">
        ⭐ {s.rating.toFixed(1)} rated
      </p>
      {variant === "cardGrid" ? (
        <div className="mt-1 box-border h-[2.875rem] w-full shrink-0 overflow-x-hidden overflow-y-auto overscroll-y-contain sm:mt-1.5 sm:h-[4rem]">
          {includesList}
        </div>
      ) : (
        includesList
      )}
      <div
        className={
          variant === "cardGrid"
            ? "flex min-h-[2.125rem] flex-col justify-end gap-0.5 text-[10px] text-ocean-600 sm:min-h-[2.25rem] sm:text-xs"
            : "flex flex-col gap-0.5 text-[10px] text-ocean-600 sm:text-xs"
        }
      >
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
