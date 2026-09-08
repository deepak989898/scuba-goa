import Link from "next/link";

const QUICK_LINKS = [
  { href: "/booking", label: "Book & pay online" },
  { href: "/hotels", label: "Hotels in Goa" },
  { href: "/offers", label: "Package offers" },
  { href: "/services", label: "All services" },
  { href: "/blog", label: "Travel blog" },
  { href: "/guides", label: "Guides" },
  { href: "/contact", label: "Contact" },
] as const;

export function FooterQuickLinks() {
  return (
    <ul className="mt-4 space-y-1 text-sm text-slate-200">
      {QUICK_LINKS.map((item) => (
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
