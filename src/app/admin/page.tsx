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

const BLOGS_SEO: DashCard[] = [
  {
    href: "/admin/blog-automation",
    title: "Blog automation",
    description: "IST schedule, drafts, and Google Business posts.",
  },
  {
    href: "/admin/seo-agent",
    title: "SEO AI",
    description: "Weekly Search Console report and ranking fixes.",
  },
  {
    href: "/admin/seo-health",
    title: "SEO health audit",
    description: "Technical audit — sitemap, schema, canonical.",
  },
  {
    href: "/admin/seo-pages",
    title: "SEO guide pages",
    description: "Landing pages at /guides/…",
  },
];

const WEBSITE_CONTENT: DashCard[] = [
  { href: "/admin/packages", title: "Packages", description: "Scuba, tours, and adventure SKUs." },
  { href: "/admin/services", title: "Services", description: "Home and /services cards." },
  { href: "/admin/offers", title: "Offers & promos", description: "Checkout promo codes." },
  { href: "/admin/hero", title: "Hero slider", description: "Homepage carousel images." },
  { href: "/admin/gallery", title: "Gallery & reels", description: "Public gallery media." },
];

const CUSTOMERS: DashCard[] = [
  { href: "/admin/ratings", title: "Reviews", description: "Approve homepage guest ratings." },
  { href: "/admin/marketing", title: "Marketing leads", description: "Lead capture and follow-up." },
];

const ANALYTICS: DashCard[] = [
  { href: "/admin/analytics", title: "Site analytics", description: "Visitors, pages, and traffic." },
  {
    href: "/admin/ai-analytics",
    title: "AI analytics agent",
    description: "Daily GA4 + GSC digest.",
  },
];

const AI_AGENTS: DashCard[] = [
  {
    href: "/admin/conversion-opt",
    title: "Conversion AI",
    description: "Funnel and CTA suggestions.",
  },
  {
    href: "/admin/pricing-agent",
    title: "AI Pricing",
    description: "Weekly market price suggestions.",
    accent: true,
  },
  {
    href: "/admin/business-agent",
    title: "Business ops agent",
    description: "Safe automatic site updates.",
  },
  {
    href: "/admin/recovery-agent",
    title: "Recovery AI",
    description: "Abandoned checkout WhatsApp recovery.",
  },
  {
    href: "/admin/marketing-engine",
    title: "Marketing AI",
    description: "Social copy and competitor scan.",
  },
];

function CardGrid({ items }: { items: DashCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className={`rounded-2xl border p-6 shadow-sm transition hover:border-ocean-300 ${
            card.accent
              ? "border-amber-200 bg-gradient-to-br from-amber-50/90 to-white ring-1 ring-amber-100"
              : "border-ocean-100 bg-white"
          }`}
        >
          <h2 className="font-display text-lg font-semibold text-ocean-900">
            {card.title}
          </h2>
          <p className="mt-2 text-sm text-ocean-700">{card.description}</p>
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
    <section className="mt-12 first:mt-8">
      <h2 className="font-display text-xl font-bold text-ocean-900">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-ocean-600">{description}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ocean-900">Dashboard</h1>

      <Section title="Blogs & SEO growth">
        <CardGrid items={BLOGS_SEO} />
      </Section>

      <Section title="Website content">
        <CardGrid items={WEBSITE_CONTENT} />
      </Section>

      <Section title="Customers & leads">
        <CardGrid items={CUSTOMERS} />
      </Section>

      <Section title="Analytics">
        <CardGrid items={ANALYTICS} />
      </Section>

      <Section
        title="AI agents"
        description="Detail pages — Command Center links here after you read the daily brief."
      >
        <CardGrid items={AI_AGENTS} />
      </Section>
    </div>
  );
}
