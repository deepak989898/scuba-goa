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
 * Grouped admin sidebar — fewer top-level items, related tools kept together.
 * Blogs / AI blogs / SEO guides live in one section so admins are not hunting.
 * Extra AI agent pages stay on Command Center (not duplicated here).
 */
export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: "daily",
    label: "1 · Check first",
    hint: "Start here each morning",
    priority: true,
    items: [
      {
        href: "/admin/command-center",
        label: "Command Center",
        description: "Daily brief, alerts & all AI agents",
        highlight: true,
        badge: "daily",
      },
      {
        href: "/admin/bookings",
        label: "Bookings",
        description: "Orders, bills & customer emails",
        highlight: true,
        badge: "action",
      },
    ],
  },
  {
    id: "blogs-guides",
    label: "2 · Blogs & guides",
    hint: "AI create → blogs & guides on one screen — check these together",
    priority: true,
    items: [
      {
        href: "/admin/ai-blog-automation",
        label: "AI Blog Automation",
        description: "Research → clusters → generate drafts",
        highlight: true,
        badge: "action",
      },
      {
        href: "/admin/blog-automation",
        label: "Blog posts & schedule",
        description: "Blogs + guides, IST schedule, GSC metrics",
        highlight: true,
      },
      {
        href: "/admin/seo-agent",
        label: "SEO AI report",
        description: "Weekly GSC rankings & meta fixes",
      },
      {
        href: "/admin/seo-health",
        label: "SEO health",
        description: "Sitemap, schema, technical audit",
      },
      {
        href: "/admin/gsc-agent",
        label: "GSC Indexing Agent",
        description: "Index status, sitemaps, approvals",
        highlight: true,
        badge: "action",
      },
      {
        href: "/admin/seo-intelligence",
        label: "SEO Intelligence",
        description: "Competitors, keywords, suggestions",
        highlight: true,
        badge: "action",
      },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    items: [
      {
        href: "/admin/analytics",
        label: "Site analytics",
        description: "Visitors, pages & clicks",
      },
      {
        href: "/admin/ai-analytics",
        label: "AI analytics",
        description: "Daily GA4 + GSC digest",
      },
    ],
  },
  {
    id: "website",
    label: "Website",
    hint: "Catalog, homepage & media",
    items: [
      { href: "/admin/packages", label: "Packages" },
      { href: "/admin/services", label: "Services" },
      { href: "/admin/offers", label: "Offers" },
      { href: "/admin/hero", label: "Hero slides" },
      { href: "/admin/gallery", label: "Gallery" },
      { href: "/admin/about", label: "About images" },
      { href: "/admin/image-gaps", label: "Image gaps" },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    items: [
      { href: "/admin/ratings", label: "Reviews" },
      { href: "/admin/marketing", label: "Marketing leads" },
    ],
  },
];

export function adminNavIsActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function adminNavCurrentLabel(pathname: string): string {
  for (const section of ADMIN_NAV_SECTIONS) {
    for (const item of section.items) {
      if (adminNavIsActive(pathname, item.href)) return item.label;
    }
  }
  // Redirected / legacy paths still show a sensible title
  if (pathname.startsWith("/admin/seo-blog-center")) return "AI Blog Automation";
  return "Admin";
}

/** Flat list for search / breadcrumbs */
export function adminNavAllItems(): AdminNavItem[] {
  return ADMIN_NAV_SECTIONS.flatMap((s) => s.items);
}
