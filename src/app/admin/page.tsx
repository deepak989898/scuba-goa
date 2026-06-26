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

const WEBSITE_CONTENT: DashCard[] = [
  {
    href: "/admin/packages",
    title: "Packages",
    description: "Scuba, tours, nightlife, and adventure SKUs.",
  },
  {
    href: "/admin/services",
    title: "Services",
    description: "Home and /services cards — slug matches the public URL.",
  },
  {
    href: "/admin/offers",
    title: "Offers & promos",
    description: "Promo codes for online checkout.",
  },
  {
    href: "/admin/hero",
    title: "Hero slider",
    description: "Homepage hero images — add, reorder, delete.",
  },
  {
    href: "/admin/gallery",
    title: "Gallery & reels",
    description: "Public gallery photos and video URLs.",
  },
  {
    href: "/admin/seo-pages",
    title: "SEO guide pages",
    description: "Landing pages at /guides/… with meta and booking links.",
  },
];

const BLOGS_SEO: DashCard[] = [
  {
    href: "/admin/seo-blog-center",
    title: "SEO Blog Center",
    description: "GSC keywords, city research, schema, ALT text, auto publish.",
    accent: true,
  },
  {
    href: "/admin/blog-automation",
    title: "Blog automation",
    description: "IST schedule, drafts, Google Business Profile posts.",
  },
];

const OPERATIONS: DashCard[] = [
  {
    href: "/admin/bookings",
    title: "Bookings",
    description: "Paid Razorpay orders, bills, and customer emails.",
  },
  {
    href: "/admin/ratings",
    title: "Reviews",
    description: "Approve or remove homepage guest ratings.",
  },
  {
    href: "/admin/marketing",
    title: "Marketing leads",
    description: "Lead capture, offers, and follow-up queue.",
  },
];

const ANALYTICS: DashCard[] = [
  {
    href: "/admin/analytics",
    title: "Site analytics",
    description: "Live visitors, pages, clicks, and traffic sources.",
  },
  {
    href: "/admin/ai-analytics",
    title: "AI analytics agent",
    description: "Daily GA4 + Search Console digest to Telegram/email.",
  },
];

const AI_AGENTS: DashCard[] = [
  {
    href: "/admin/command-center",
    title: "Command Center",
    description: "Daily AI brief, alerts, and links to all agents.",
    accent: true,
  },
  {
    href: "/admin/conversion-opt",
    title: "Conversion AI",
    description: "Funnel and CTA improvement suggestions.",
  },
  {
    href: "/admin/seo-agent",
    title: "SEO AI",
    description: "Weekly GSC report and meta fixes.",
  },
  {
    href: "/admin/seo-health",
    title: "SEO health audit",
    description: "Technical audit — sitemap, schema, canonical.",
  },
  {
    href: "/admin/business-agent",
    title: "Business ops agent",
    description: "Safe auto-updates from daily analytics.",
  },
  {
    href: "/admin/recovery-agent",
    title: "Recovery AI",
    description: "Abandoned checkout WhatsApp recovery.",
  },
  {
    href: "/admin/marketing-engine",
    title: "Marketing AI",
    description: "Social copy, competitor scan, blog topics.",
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
              ? "border-cyan-200 bg-gradient-to-br from-cyan-50/80 to-white ring-1 ring-cyan-100"
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
    <section className="mt-12 first:mt-10">
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
      <p className="mt-2 max-w-2xl text-ocean-700">
        One place for website content, bookings, blogs, analytics, and AI tools. Use the
        sidebar for Command Center and SEO Blog Center — everything else is linked below.
      </p>

      <Section
        title="Blogs & SEO"
        description="Keyword research and automatic publishing."
      >
        <CardGrid items={BLOGS_SEO} />
      </Section>

      <Section title="Website content" description="Catalog, homepage, and guides.">
        <CardGrid items={WEBSITE_CONTENT} />
      </Section>

      <Section title="Bookings & leads">
        <CardGrid items={OPERATIONS} />
      </Section>

      <Section title="Analytics">
        <CardGrid items={ANALYTICS} />
      </Section>

      <Section
        title="AI agents"
        description="Open Command Center first for the daily brief and agent status."
      >
        <CardGrid items={AI_AGENTS} />
      </Section>
    </div>
  );
}
