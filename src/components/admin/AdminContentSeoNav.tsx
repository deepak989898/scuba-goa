"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  {
    href: "/admin/ai-blog-automation",
    label: "AI Blog Automation",
    short: "AI create",
  },
  {
    href: "/admin/blog-automation",
    label: "Blog posts & schedule",
    short: "Live blogs",
  },
  {
    href: "/admin/seo-pages",
    label: "SEO guide pages",
    short: "Guides",
  },
  {
    href: "/admin/gsc-agent",
    label: "GSC Indexing Agent",
    short: "GSC",
  },
] as const;

/**
 * Compact switcher so related content/SEO tools stay one click apart.
 */
export function AdminContentSeoNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-ocean-100 bg-white p-1.5 shadow-sm"
      aria-label="Blogs and guides tools"
    >
      <span className="hidden px-2 text-[10px] font-bold uppercase tracking-wide text-ocean-500 sm:inline">
        Blogs & guides
      </span>
      {LINKS.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
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
            <span className="sm:hidden">{link.short}</span>
            <span className="hidden sm:inline">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
