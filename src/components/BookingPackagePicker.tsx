"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { PackageDoc } from "@/lib/types";
import type { ServiceItem } from "@/data/services";
import {
  encodePackageOption,
  encodeServiceBaseOption,
  encodeServiceSubOption,
} from "@/lib/booking-selection";
import {
  getPricedSubServicesWithIndex,
  getSubServiceCartKey,
} from "@/lib/service-sub-helpers";

type Props = {
  packagesByCategory: [string, PackageDoc[]][];
  services: ServiceItem[];
  onSelect: (encodedValue: string) => void;
};

function SectionHeader({ children }: { children: string }) {
  return (
    <div
      className="border-b border-ocean-800/40 bg-gradient-to-r from-ocean-900 via-ocean-800 to-ocean-800 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-amber-100"
      role="presentation"
    >
      {children}
    </div>
  );
}

export function BookingPackagePicker({
  packagesByCategory,
  services,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handlePick = useCallback(
    (encoded: string) => {
      onSelect(encoded);
      setOpen(false);
    },
    [onSelect]
  );

  const triggerId = `${listId}-trigger`;

  return (
    <div ref={rootRef} className="relative">
      <button
        id={triggerId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${listId}-panel` : undefined}
        onClick={() => setOpen((o) => !o)}
        className="mt-1 flex w-full min-h-[2.75rem] items-center justify-between gap-2 rounded-xl border border-ocean-200 bg-white px-3 py-2.5 text-left text-sm text-ocean-800 shadow-sm transition hover:border-ocean-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <span className="truncate text-ocean-600">
          Select to add to cart…
        </span>
        <span
          aria-hidden
          className={`shrink-0 text-xs text-ocean-500 transition ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open ? (
        <div
          id={`${listId}-panel`}
          className="absolute left-0 right-0 z-50 mt-1 max-h-[min(24rem,70vh)] overflow-y-auto overscroll-contain rounded-xl border border-ocean-200 bg-white py-0.5 shadow-xl ring-1 ring-ocean-900/10"
        >
          {packagesByCategory.map(([category, list]) => (
            <div key={`pkg-cat-${category}`}>
              <SectionHeader>{category}</SectionHeader>
              <ul className="py-0.5">
                {list.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left text-sm text-ocean-900 hover:bg-cyan-50 focus:bg-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400"
                      onClick={() => handlePick(encodePackageOption(p.id))}
                    >
                      <span className="min-w-0 flex-1 font-medium leading-snug">
                        {p.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-sm font-bold text-ocean-700">
                        ₹{p.price.toLocaleString("en-IN")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {services.map((s) => {
            const priced = getPricedSubServicesWithIndex(s);
            const showMainServiceOption =
              priced.length === 0 &&
              Number.isFinite(s.priceFrom) &&
              s.priceFrom > 0;
            return (
              <div key={`svc-${s.slug}`}>
                <SectionHeader>{s.title}</SectionHeader>
                <ul className="py-0.5">
                  {showMainServiceOption ? (
                    <li>
                      <button
                        type="button"
                        className="flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left text-sm text-ocean-900 hover:bg-cyan-50 focus:bg-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400"
                        onClick={() =>
                          handlePick(encodeServiceBaseOption(s.slug))
                        }
                      >
                        <span className="min-w-0 flex-1 font-medium leading-snug">
                          {s.title}{" "}
                          <span className="font-normal text-ocean-600">
                            (Main package)
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-sm font-bold text-ocean-700">
                          ₹{s.priceFrom!.toLocaleString("en-IN")}
                        </span>
                      </button>
                    </li>
                  ) : null}
                  {priced.map(({ sub, index }) => (
                    <li key={`${s.slug}-${getSubServiceCartKey(sub, index)}`}>
                      <button
                        type="button"
                        className="flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left text-sm text-ocean-900 hover:bg-cyan-50 focus:bg-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400"
                        onClick={() =>
                          handlePick(
                            encodeServiceSubOption(
                              s.slug,
                              getSubServiceCartKey(sub, index)
                            )
                          )
                        }
                      >
                        <span className="min-w-0 flex-1 font-medium leading-snug">
                          {sub.title}
                        </span>
                        <span className="shrink-0 tabular-nums text-sm font-bold text-ocean-700">
                          ₹{sub.priceFrom!.toLocaleString("en-IN")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
