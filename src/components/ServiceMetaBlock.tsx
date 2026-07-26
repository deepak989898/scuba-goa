import type { ServiceItem } from "@/data/services";
import { getAggregatedServiceSlots } from "@/lib/service-slot-totals";

type Variant = "default" | "cardGrid";

/** Package-style detail row used on service cards & grids */
export function ServiceMetaBlock({
  s,
  variant = "default",
  showScarcity = true,
}: {
  s: ServiceItem;
  variant?: Variant;
  showScarcity?: boolean;
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
    <div className="mt-1 space-y-0.5 sm:mt-1.5 sm:space-y-1">
      <p
        className={
          variant === "cardGrid"
            ? "min-h-[1rem] truncate text-[10px] font-medium text-ocean-700 sm:min-h-0 sm:text-xs"
            : "text-xs font-medium text-ocean-700"
        }
      >
        {s.duration}
      </p>
      <p
        className={
          variant === "cardGrid"
            ? "min-h-[1rem] text-[10px] font-medium text-amber-700 sm:min-h-0 sm:text-xs"
            : "text-xs font-medium text-amber-700"
        }
      >
        ⭐ {s.rating.toFixed(1)} rated
      </p>
      {variant === "cardGrid" ? (
        <div className="mt-1 box-border h-[3.25rem] max-h-[3.25rem] w-full shrink-0 overflow-x-hidden overflow-y-auto overscroll-y-contain sm:mt-1.5 sm:h-[4rem] sm:max-h-[4rem]">
          {includesList}
        </div>
      ) : (
        includesList
      )}
      {showScarcity ? (
        <div
          className={
            variant === "cardGrid"
              ? "flex min-h-[2rem] flex-col justify-end gap-0.5 text-[9px] font-medium text-ocean-700 sm:min-h-[1.5rem] sm:text-xs"
              : "flex flex-col gap-0.5 text-[10px] font-medium text-ocean-700 sm:text-xs"
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
      ) : null}
    </div>
  );
}
