export type AdminNavItem = {
  href: string;
  label: string;
  description?: string;
  highlight?: boolean;
};

export type AdminNavSection = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        description: "Quick links and status",
      },
      {
        href: "/admin/command-center",
        label: "Command Center",
        description: "Daily AI brief & tasks",
        highlight: true,
      },
    ],
  },
  {
    id: "catalog",
    label: "Website content",
    items: [
      { href: "/admin/packages", label: "Packages", description: "Scuba & tour SKUs" },
      { href: "/admin/services", label: "Services", description: "Service cards & pricing" },
      { href: "/admin/offers", label: "Offers", description: "Promo codes" },
      { href: "/admin/hero", label: "Hero slides", description: "Homepage carousel" },
      { href: "/admin/gallery", label: "Gallery", description: "Photos & reels" },
      { href: "/admin/seo-pages", label: "SEO guides", description: "Guide pages" },
      {
        href: "/admin/blog-automation",
        label: "Blog automation",
        description: "Daily posts & GBP",
      },
      {
        href: "/admin/seo-blog-center",
        label: "SEO Blog Center",
        description: "GSC keywords, city research, auto publish",
        highlight: true,
      },
    ],
  },
  {
    id: "operations",
    label: "Bookings & reviews",
    items: [
      { href: "/admin/bookings", label: "Bookings", description: "Paid orders & bills" },
      { href: "/admin/ratings", label: "Reviews", description: "Customer ratings" },
      { href: "/admin/marketing", label: "Marketing leads", description: "Lead capture" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    items: [
      { href: "/admin/analytics", label: "Site analytics", description: "Visitors & pages" },
      {
        href: "/admin/ai-analytics",
        label: "AI analytics agent",
        description: "Daily GA4 + GSC report",
      },
    ],
  },
  {
    id: "ai-agents",
    label: "AI agents",
    items: [
      {
        href: "/admin/conversion-opt",
        label: "Conversion AI",
        description: "Funnel & CTA suggestions",
      },
      { href: "/admin/seo-agent", label: "SEO AI", description: "Meta & ranking fixes" },
      { href: "/admin/seo-health", label: "SEO health", description: "Technical audit" },
      {
        href: "/admin/business-agent",
        label: "Business ops agent",
        description: "Auto site updates",
      },
      {
        href: "/admin/recovery-agent",
        label: "Recovery AI",
        description: "WhatsApp booking recovery",
      },
      {
        href: "/admin/marketing-engine",
        label: "Marketing AI",
        description: "Social & campaigns",
      },
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
