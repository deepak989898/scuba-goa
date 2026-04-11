"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePackages } from "@/hooks/usePackages";
import { useServices } from "@/hooks/useServices";
import { whatsappLink } from "@/lib/constants";
import { ADVANCE_BOOKING_INR } from "@/lib/payment";

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
    ? `Limited slots: about ${top.slotsLeft ?? 3} left on ${top.name}. Book now so your date doesn’t slip.`
    : "Weekends fill first — lock your slot today before plans change.";

  const priceLine = top
    ? `${top.name} — from ₹${top.price.toLocaleString("en-IN")} (pay ₹${ADVANCE_BOOKING_INR.toLocaleString("en-IN")} advance online to lock at checkout)`
    : `See exact dive price on the next screen — pay ₹${ADVANCE_BOOKING_INR.toLocaleString("en-IN")} advance to lock`;

  const urgencyMeta = top
    ? `Today · Slots left: ~${top.slotsLeft ?? 3}`
    : "Today · High-demand dates go first";

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
              <p className="mt-1 text-lg font-extrabold tracking-tight text-ocean-900 sm:text-2xl">
                {priceLine}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900 sm:text-xs">
                {urgencyMeta}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/booking"
                className="inline-flex rounded-full bg-ocean-gradient px-4 py-2 text-xs font-bold text-white shadow-sm sm:text-sm"
              >
                Book now
              </Link>
              <a
                href={whatsappLink(
                  "Hi, I came from your site/ad. I want to book scuba in Goa — please share today’s best slot and price."
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full border border-ocean-300 bg-white px-4 py-2 text-xs font-bold text-ocean-800 sm:text-sm"
              >
                WhatsApp booking
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

