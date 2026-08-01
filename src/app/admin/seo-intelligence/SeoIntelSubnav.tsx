"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/admin/seo-intelligence", label: "Overview", exact: true },
  { href: "/admin/seo-intelligence/competitors", label: "Competitors" },
  { href: "/admin/seo-intelligence/keywords", label: "Keyword Rankings" },
  { href: "/admin/seo-intelligence/keyword-gap", label: "Keyword Gap" },
  { href: "/admin/seo-intelligence/content-gap", label: "Content Gap" },
  { href: "/admin/seo-intelligence/opportunities", label: "Opportunities" },
  { href: "/admin/seo-intelligence/suggestions", label: "Suggestions" },
  { href: "/admin/seo-intelligence/approvals", label: "Approval Queue" },
  { href: "/admin/seo-intelligence/applied", label: "Applied Changes" },
  { href: "/admin/seo-intelligence/settings", label: "Settings" },
  { href: "/admin/seo-intelligence/logs", label: "Activity Logs" },
];

export function SeoIntelSubnav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-3 flex flex-wrap gap-1.5 rounded-xl border border-ocean-100 bg-white p-1.5 shadow-sm"
      aria-label="SEO Intelligence sections"
    >
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              active
                ? "bg-ocean-800 text-white"
                : "text-ocean-700 hover:bg-ocean-50"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
