import type { Metadata } from "next";
import Link from "next/link";
import { blogPostsPillarFirst } from "@/data/blog-posts";
import { PRIMARY_SEO_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Scuba Diving in Goa Blog — Price, Safety & Best Time | Book Scuba Goa",
  description:
    "Scuba diving in Goa guides: best time to dive, is scuba diving safe, scuba diving price Goa & 2026 price guide—plus tours, Dudhsagar, water sports, and FAQs with booking links.",
  keywords: [
    ...PRIMARY_SEO_KEYWORDS,
    "scuba diving Goa blog",
    "Goa travel guide",
    "water sports Goa tips",
    "Dudhsagar trip planning",
  ],
  alternates: {
    canonical: `${SITE_URL.replace(/\/$/, "")}/blog`,
  },
  openGraph: {
    title: `Scuba diving in Goa — guides | ${SITE_NAME}`,
    description:
      "Pillar guides for scuba diving price Goa, safety, and seasonality—plus Goa tours and activities with direct booking.",
    type: "website",
    url: `${SITE_URL.replace(/\/$/, "")}/blog`,
  },
};

export default function BlogIndexPage() {
  return (
    <div className="bg-sand py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold text-ocean-900">
          Scuba diving in Goa — guides & blog
        </h1>
        <p className="mt-3 max-w-2xl text-ocean-700">
          Start with our three pillar guides (best time, safety, scuba diving price Goa
          for 2026), then explore tours, monsoon tips, and activity deep-dives—each
          article links to live booking.
        </p>
        <ul className="mt-12 space-y-6">
          {blogPostsPillarFirst().map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="block rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm transition hover:border-ocean-300"
              >
                <p className="text-xs text-ocean-500">
                  {p.date} · {p.readTime}
                </p>
                <h2 className="mt-2 font-display text-xl font-semibold text-ocean-900">
                  {p.title}
                </h2>
                <p className="mt-2 text-sm text-ocean-700">{p.excerpt}</p>
                <p className="mt-3 text-xs text-ocean-500">
                  {p.keywords.join(" · ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
