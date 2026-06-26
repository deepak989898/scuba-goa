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

/**
 * Slim sidebar — detailed links live on the Dashboard and Command Center.
 * Keeps daily tools visible without duplicating every content page.
 */
export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: "main",
    label: "Admin menu",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        description: "Packages, services, bookings, AI agents",
      },
      {
        href: "/admin/command-center",
        label: "Command Center",
        description: "Daily AI brief & agent hub",
        highlight: true,
      },
      {
        href: "/admin/seo-blog-center",
        label: "SEO Blog Center",
        description: "GSC keywords, city research, auto publish",
        highlight: true,
      },
      {
        href: "/admin/blog-automation",
        label: "Blog automation",
        description: "Scheduled posts & Google Business",
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
