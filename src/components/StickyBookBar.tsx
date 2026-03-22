"use client";

import Link from "next/link";

/**
 * Mobile-only bottom bar: single primary CTA. WhatsApp is only via the green
 * floating button (no duplicate).
 */
export function StickyBookBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-ocean-100 bg-white/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_-8px_30px_rgba(12,74,110,0.12)] backdrop-blur md:hidden">
      <div className="mx-auto max-w-lg">
        <Link
          href="/booking"
          className="block min-h-12 w-full rounded-full bg-ocean-gradient py-3.5 text-center text-sm font-semibold text-white shadow-md active:opacity-90"
        >
          Book Now
        </Link>
      </div>
    </div>
  );
}
