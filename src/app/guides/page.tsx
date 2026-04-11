import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { listPublishedSeoPagesServer } from "@/lib/seo-pages-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Travel & activity guides | ${SITE_NAME}`,
  description:
    "Practical guides for scuba diving in Goa, tours, water sports, and bookings — written to help you choose the right experience before you pay.",
  alternates: {
    canonical: `${SITE_URL.replace(/\/$/, "")}/guides`,
  },
  openGraph: {
    title: `Guides | ${SITE_NAME}`,
    description:
      "Read short guides, then book scuba diving in Goa, tours, and activities with clear pricing and Razorpay checkout.",
    url: `${SITE_URL.replace(/\/$/, "")}/guides`,
    siteName: SITE_NAME,
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default async function GuidesIndexPage() {
  const guides = await listPublishedSeoPagesServer();

  return (
    <div className="bg-sand/30 py-14 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <nav className="text-sm text-ocean-600" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-ocean-800">
            Home
          </Link>
          <span className="mx-2 text-ocean-400">/</span>
          <span className="text-ocean-500">Guides</span>
        </nav>
        <h1 className="mt-6 font-display text-3xl font-bold text-ocean-900 sm:text-4xl">
          Guides
        </h1>
        <p className="mt-3 text-lg text-ocean-700">
          Quick reads to help you plan, then book on the main site with live rates and
          WhatsApp support.
        </p>

        {guides.length === 0 ? (
          <p className="mt-10 rounded-xl border border-ocean-100 bg-white p-6 text-ocean-600">
            New guides will appear here once your team publishes them from the admin panel
            (SEO pages).
          </p>
        ) : (
          <ul className="mt-10 space-y-4">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="block rounded-2xl border border-ocean-100 bg-white p-5 shadow-sm transition hover:border-ocean-300 hover:shadow-md"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-ocean-500">
                    Updated {new Date(g.updatedAt).toLocaleDateString("en-IN")}
                  </p>
                  <p className="mt-2 font-display text-lg font-semibold text-ocean-900">
                    {g.headline}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ocean-600">Read guide →</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <section className="mt-14 rounded-2xl border border-ocean-100 bg-white p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold text-ocean-900">Ready to book?</h2>
          <p className="mt-2 text-sm text-ocean-700 sm:text-base">
            Compare packages and services, then pay a small advance online to lock your slot.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/booking"
              className="inline-flex rounded-full bg-ocean-gradient px-5 py-2.5 text-sm font-bold text-white hover:opacity-95"
            >
              Book now
            </Link>
            <Link
              href="/blog"
              className="inline-flex rounded-full border border-ocean-200 px-5 py-2.5 text-sm font-semibold text-ocean-800 hover:border-ocean-400"
            >
              Travel blog
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
