export type AdminNavBadge = "daily" | "action";

export type AdminNavItem = {
  href: string;
  label: string;
  description?: string;
  /** Show in the “check first” style (cyan accent). */
  highlight?: boolean;
  badge?: AdminNavBadge;
};

export type AdminNavSection = {
  id: string;
  label: string;
  /** Short note under the section title — when to use this group. */
  hint?: string;
  /** Top sections use stronger visual emphasis. */
  priority?: boolean;
  items: AdminNavItem[];
};

/**
 * Grouped admin sidebar — ordered by what needs attention first.
 * Section 1 = daily checklist; below = content, growth, analytics, AI.
 */
export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: "daily",
    label: "1 · Check first",
    hint: "Every morning — start here before anything else",
    priority: true,
    items: [
      {
        href: "/admin/command-center",
        label: "Command Center",
        description: "Daily AI brief, alerts & pending approvals",
        highlight: true,
        badge: "daily",
      },
      {
        href: "/admin/bookings",
        label: "Bookings",
        description: "New paid orders, bills & customer emails",
        highlight: true,
        badge: "action",
      },
      {
        href: "/admin/seo-blog-center",
        label: "SEO Blog Center",
        description: "GSC keywords → approve → publish blogs",
        highlight: true,
        badge: "action",
      },
    ],
  },
  {
    id: "overview",
    label: "Overview",
    hint: "Map of everything in one place",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        description: "Quick links grouped by topic",
      },
    ],
  },
  {
    id: "blogs-seo",
    label: "Blogs & SEO growth",
    hint: "Traffic, rankings, and automatic content",
    items: [
      {
        href: "/admin/blog-automation",
        label: "Blog automation",
        description: "IST schedule, drafts & Google Business",
      },
      {
        href: "/admin/seo-agent",
        label: "SEO AI",
        description: "Weekly GSC report & meta fixes",
      },
      {
        href: "/admin/seo-health",
        label: "SEO health audit",
        description: "Sitemap, schema, technical checks",
      },
      {
        href: "/admin/seo-pages",
        label: "SEO guide pages",
        description: "Landing pages at /guides/…",
      },
    ],
  },
  {
    id: "content",
    label: "Website content",
    hint: "Prices, homepage, and catalog",
    items: [
      { href: "/admin/packages", label: "Packages", description: "Scuba & tour SKUs" },
      { href: "/admin/services", label: "Services", description: "Service cards & pricing" },
      { href: "/admin/offers", label: "Offers & promos", description: "Checkout promo codes" },
      { href: "/admin/hero", label: "Hero slides", description: "Homepage carousel" },
      { href: "/admin/gallery", label: "Gallery", description: "Photos & reels" },
    ],
  },
  {
    id: "customers",
    label: "Customers & leads",
    items: [
      { href: "/admin/ratings", label: "Reviews", description: "Approve homepage ratings" },
      { href: "/admin/marketing", label: "Marketing leads", description: "Lead capture & follow-up" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    items: [
      { href: "/admin/analytics", label: "Site analytics", description: "Visitors, pages & clicks" },
      {
        href: "/admin/ai-analytics",
        label: "AI analytics agent",
        description: "Daily GA4 + GSC digest",
      },
    ],
  },
  {
    id: "ai-agents",
    label: "AI agents",
    hint: "Open Command Center first — these are detail pages",
    items: [
      { href: "/admin/conversion-opt", label: "Conversion AI", description: "Funnel & CTA ideas" },
      { href: "/admin/business-agent", label: "Business ops agent", description: "Safe auto site updates" },
      { href: "/admin/recovery-agent", label: "Recovery AI", description: "WhatsApp booking recovery" },
      { href: "/admin/marketing-engine", label: "Marketing AI", description: "Social & competitor scan" },
    ],
  },
];

export function adminNavIsActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function adminNavCurrentLabel(pathname: string): string {
  for (const section of ADMIN_NAV_SECTIONS) {
    for (const item of section.items) {
      if (adminNavIsActive(pathname, item.href)) return item.label;
    }
  }
  return "Admin";
}

/** Flat list for search / breadcrumbs */
export function adminNavAllItems(): AdminNavItem[] {
  return ADMIN_NAV_SECTIONS.flatMap((s) => s.items);
}
