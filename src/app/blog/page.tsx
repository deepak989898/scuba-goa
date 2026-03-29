import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "@/data/blog-posts";

export const metadata: Metadata = {
  title: "Goa Travel & Scuba Blog | Book Scuba Goa",
  description:
    "Long-form guides: best time to scuba dive in Goa, safety, pricing, water sports without hidden fees, Dudhsagar, North/South tours, nightlife, and family itineraries—with FAQs and booking links.",
  keywords: [
    "scuba diving Goa blog",
    "Goa travel guide",
    "water sports Goa tips",
    "Dudhsagar trip planning",
    "Goa monsoon travel",
  ],
  openGraph: {
    title: "Goa Travel & Scuba Blog",
    description:
      "Authority-level guides for diving, tours, and activities in Goa—with FAQs and direct booking links.",
    type: "website",
  },
};

export default function BlogIndexPage() {
  return (
    <div className="bg-sand py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold text-ocean-900">
          Goa travel blog
        </h1>
        <p className="mt-3 text-ocean-700">
          SEO-focused articles to help you plan smarter dives, tours, and nightlife in
          Goa.
        </p>
        <ul className="mt-12 space-y-6">
          {blogPosts.map((p) => (
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
