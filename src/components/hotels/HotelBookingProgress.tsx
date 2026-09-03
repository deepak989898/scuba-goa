"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { href: "/hotels", label: "Search" },
  { href: "/hotels/results", label: "Results" },
  { href: "/hotels/guests", label: "Guests" },
  { href: "/hotels/review", label: "Review" },
  { href: "/hotels/payment", label: "Pay" },
] as const;

export function HotelBookingProgress() {
  const pathname = usePathname();
  const idx = STEPS.findIndex(
    (s) => pathname === s.href || pathname?.startsWith(`${s.href}/`),
  );
  const active = idx >= 0 ? idx : 0;

  return (
    <nav
      className="mb-6 flex flex-wrap items-center gap-2 text-xs font-medium text-ocean-600"
      aria-label="Booking progress"
    >
      {STEPS.map((step, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <span key={step.href} className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 ${
                current
                  ? "bg-ocean-800 text-white"
                  : done
                    ? "bg-ocean-100 text-ocean-800"
                    : "bg-ocean-50 text-ocean-500"
              }`}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-ocean-300">›</span>}
          </span>
        );
      })}
    </nav>
  );
}
