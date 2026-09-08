"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { href: "/hotels", label: "Hotels" },
  { href: "/hotels/guests", label: "Guests & pay" },
  { href: "/hotels/booking-success", label: "Done" },
] as const;

export function HotelBookingProgress() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hotel booking progress"
      className="mb-6 flex flex-wrap gap-2 text-xs font-medium text-ocean-600"
    >
      {STEPS.map((step, i) => {
        const active =
          pathname === step.href || pathname?.startsWith(`${step.href}/`);
        const done =
          STEPS.findIndex((s) => pathname === s.href || pathname?.startsWith(`${s.href}/`)) >
          i;
        return (
          <span key={step.href} className="inline-flex items-center gap-2">
            {i > 0 ? <span className="text-ocean-300">›</span> : null}
            {active || done ? (
              <Link
                href={step.href}
                className={
                  active
                    ? "rounded-full bg-cyan-100 px-3 py-1 text-cyan-900"
                    : "text-ocean-500"
                }
              >
                {step.label}
              </Link>
            ) : (
              <span className="rounded-full px-3 py-1 text-ocean-400">{step.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
