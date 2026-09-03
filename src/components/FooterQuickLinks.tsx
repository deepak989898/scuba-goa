"use client";

import Link from "next/link";
import { useHotelsMenuVisible } from "@/hooks/useHotelsMenuVisible";

const QUICK_LINKS = [
  { href: "/booking", label: "Book & pay online" },
  { href: "/hotels", label: "Hotels in Goa", hotelsOnly: true },
  { href: "/offers", label: "Package offers" },
  { href: "/services", label: "All services" },
  { href: "/blog", label: "Travel blog" },
  { href: "/guides", label: "Guides" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
] as const;

export function FooterQuickLinks() {
  const { visible: hotelsVisible, loading } = useHotelsMenuVisible();

  const links = QUICK_LINKS.filter(
    (item) =>
      !("hotelsOnly" in item && item.hotelsOnly) ||
      hotelsVisible ||
      loading,
  );

  return (
    <ul className="mt-4 space-y-1 text-sm text-slate-200">
      {links.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="group inline-flex min-h-8 items-center gap-2 transition hover:translate-x-1 hover:text-cyan-300"
          >
            <span
              className="text-cyan-500 transition group-hover:text-cyan-300"
              aria-hidden
            >
              ›
            </span>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
