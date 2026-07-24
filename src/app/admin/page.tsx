import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

type DashCard = {
  href: string;
  title: string;
  description: string;
  accent?: boolean;
};

const DAILY: DashCard[] = [
  {
    href: "/admin/command-center",
    title: "Command Center",
    description: "Daily brief, alerts, and links to all AI agents.",
    accent: true,
  },
  {
    href: "/admin/bookings",
    title: "Bookings",
    description: "Paid orders, bills, and customer emails.",
    accent: true,
  },
];

/** Keep these three together — same as sidebar “Blogs & guides”. */
const BLOGS_GUIDES: DashCard[] = [
  {
    href: "/admin/ai-blog-automation",
    title: "AI Blog Automation",
    description: "Research keywords → clusters → generate drafts.",
    accent: true,
  },
  {
    href: "/admin/blog-automation",
    title: "Blog posts & schedule",
    description: "Edit live posts, IST schedule, Google Business.",
    accent: true,
  },
  {
    href: "/admin/seo-pages",
    title: "SEO guide pages",
    description: "Landing pages at /guides/…",
    accent: true,
  },
  {
    href: "/admin/seo-agent",
    title: "SEO AI report",
    description: "Weekly Search Console rankings and meta fixes.",
  },
  {
    href: "/admin/seo-health",
    title: "SEO health",
    description: "Technical audit — sitemap, schema, canonical.",
  },
];

const WEBSITE: DashCard[] = [
  { href: "/admin/packages", title: "Packages", description: "Scuba, tours, and adventure SKUs." },
  { href: "/admin/services", title: "Services", description: "Home and /services cards." },
  { href: "/admin/offers", title: "Offers", description: "Checkout promo codes." },
  { href: "/admin/hero", title: "Hero slides", description: "Homepage carousel." },
  { href: "/admin/gallery", title: "Gallery", description: "Photos and reels." },
];

const CUSTOMERS: DashCard[] = [
  { href: "/admin/ratings", title: "Reviews", description: "Approve homepage guest ratings." },
  { href: "/admin/marketing", title: "Marketing leads", description: "Lead capture and follow-up." },
];

const ANALYTICS: DashCard[] = [
  { href: "/admin/analytics", title: "Site analytics", description: "Visitors, pages, and traffic." },
  {
    href: "/admin/ai-analytics",
    title: "AI analytics",
    description: "Daily GA4 + GSC digest.",
  },
];

function CardGrid({ items }: { items: DashCard[] }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className={`rounded-xl border p-3 shadow-sm transition hover:border-ocean-300 ${
            card.accent
              ? "border-amber-200 bg-gradient-to-br from-amber-50/90 to-white ring-1 ring-amber-100"
              : "border-ocean-100 bg-white"
          }`}
        >
          <h2 className="font-display text-base font-semibold text-ocean-900">
            {card.title}
          </h2>
          <p className="mt-1 text-xs text-ocean-700">{card.description}</p>
        </Link>
      ))}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-4 first:mt-3">
      <h2 className="font-display text-base font-bold text-ocean-900">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-ocean-600">{description}</p>
      ) : null}
      <div className="mt-2">{children}</div>
    </section>
  );
}

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="font-display text-base font-bold text-ocean-900">Dashboard</h1>
      <p className="mt-1 text-sm text-ocean-600">
        Use the sidebar groups — blogs & guides stay together so you are not hunting menus.
      </p>

      <Section title="1 · Check first">
        <CardGrid items={DAILY} />
      </Section>

      <Section
        title="2 · Blogs & guides"
        description="AI create → live blog posts → SEO guides. Open these as one workflow."
      >
        <CardGrid items={BLOGS_GUIDES} />
      </Section>

      <Section title="Website">
        <CardGrid items={WEBSITE} />
      </Section>

      <Section title="Customers">
        <CardGrid items={CUSTOMERS} />
      </Section>

      <Section title="Analytics">
        <CardGrid items={ANALYTICS} />
      </Section>

      <p className="mt-6 rounded-xl border border-ocean-100 bg-white p-3 text-sm text-ocean-700">
        Other AI agents (pricing, recovery, marketing, conversion, business ops) open from{" "}
        <Link
          href="/admin/command-center"
          className="font-semibold text-ocean-800 underline-offset-2 hover:underline"
        >
          Command Center
        </Link>
        {" "}
        — they are not duplicated in the sidebar.
      </p>
    </div>
  );
}
