"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePackages } from "@/hooks/usePackages";
import { useServices } from "@/hooks/useServices";
import { whatsappLink } from "@/lib/constants";

export function AdConversionStrip() {
  const { packages } = usePackages();
  const { services } = useServices();

  const top = useMemo(() => {
    const pkg = packages
      .filter((p) => Number.isFinite(p.price) && p.price > 0)
      .sort((a, b) => {
        const aScore = (a.bookedToday ?? 0) * 2 + (a.limitedSlots ? 5 : 0);
        const bScore = (b.bookedToday ?? 0) * 2 + (b.limitedSlots ? 5 : 0);
        return bScore - aScore;
      })[0];

    const svc = services
      .filter((s) => Number.isFinite(s.priceFrom) && s.priceFrom > 0)
      .sort((a, b) => {
        const aScore = (a.bookedToday ?? 0) * 2 + (a.limitedSlots ? 5 : 0);
        const bScore = (b.bookedToday ?? 0) * 2 + (b.limitedSlots ? 5 : 0);
        return bScore - aScore;
      })[0];

    if (pkg && (!svc || (pkg.bookedToday ?? 0) >= (svc.bookedToday ?? 0))) {
      return {
        name: pkg.name,
        price: pkg.price,
        slotsLeft: pkg.slotsLeft,
      };
    }
    if (svc) {
      return {
        name: svc.title,
        price: svc.priceFrom,
        slotsLeft: svc.slotsLeft,
      };
    }
    return null;
  }, [packages, services]);

  const urgentLine = top
    ? `Only ${top.slotsLeft ?? 3} slots left for tomorrow ⚡ Book now & get up to ₹500 off on selected plans.`
    : "High-demand slots are filling fast ⚡ Book now & get up to ₹500 off on selected plans.";

  const priceLine = top
    ? `${top.name} from ₹${top.price.toLocaleString("en-IN")}`
    : "Live rates available in booking";

  return (
    <section
      className="relative z-10 border-y border-amber-100/80 bg-amber-50/90 py-4 sm:py-5"
      id="urgency"
      aria-label="Limited-time offer"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="u-depth-card rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-amber-900 sm:text-base">{urgentLine}</p>
              <p className="mt-1 text-xs text-amber-800 sm:text-sm">{priceLine}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/booking"
                className="inline-flex rounded-full bg-ocean-gradient px-4 py-2 text-xs font-semibold text-white sm:text-sm"
              >
                Book now
              </Link>
              <a
                href={whatsappLink(
                  "Hi, I came from Facebook ad. Please give best offer for tomorrow. People: , Pickup area: "
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full border border-ocean-300 bg-white px-4 py-2 text-xs font-semibold text-ocean-800 sm:text-sm"
              >
                Claim offer on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

