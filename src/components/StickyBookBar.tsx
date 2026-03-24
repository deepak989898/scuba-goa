"use client";

import Link from "next/link";

/**
 * Mobile-only bottom bar: single primary CTA. WhatsApp is only via the green
 * floating button (no duplicate).
 */
export function StickyBookBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/15 bg-transparent px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm md:hidden">
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
