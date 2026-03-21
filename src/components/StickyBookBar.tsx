"use client";

import Link from "next/link";
import { whatsappLink } from "@/lib/constants";

export function StickyBookBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-ocean-100 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(12,74,110,0.12)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg gap-2">
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-full border border-ocean-200 py-3 text-center text-sm font-semibold text-ocean-800"
        >
          WhatsApp
        </a>
        <Link
          href="/booking"
          className="flex-[1.2] rounded-full bg-ocean-gradient py-3 text-center text-sm font-semibold text-white shadow-md"
        >
          Book Now
        </Link>
      </div>
    </div>
  );
}
