import type { Metadata } from "next";
import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { getAllBlogPostsMerged } from "@/lib/blog-posts-unified";
import { BOOK_SCUBA_FAQ, faqPageJsonLd } from "@/lib/seo-health/faq-data";
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

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

const GUIDE_FALLBACKS = [
  u("photo-1544551763-46a013bb70d5"),
  u("photo-1559827260-dc66d52bef19"),
  u("photo-1530549387789-4c1017266635"),
  u("photo-1488646953014-85cb44e25828"),
];

const BLOG_FALLBACKS = [
  u("photo-1682687220063-4742bd7fd538"),
  u("photo-1582967788606-a171f1080dd0"),
  u("photo-1432405972618-c60b0225b8f9"),
  u("photo-1507525428034-b723cf961d3e"),
];

export default async function GuidesIndexPage() {
  const [guides, blogs] = await Promise.all([
    listPublishedSeoPagesServer(),
    getAllBlogPostsMerged(),
  ]);
  const sidebarBlogs = blogs.slice(0, 5);
  const faqLd = faqPageJsonLd(BOOK_SCUBA_FAQ.slice(0, 6));

  return (
    <div className="bg-sand/30 py-5 sm:py-7">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-7 lg:px-8">
        <div className="min-w-0">
          <nav className="text-sm text-ocean-700" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ocean-800">
              Home
            </Link>
            <span className="mx-2 text-ocean-400">/</span>
            <span className="text-ocean-500">Guides</span>
          </nav>
          <h1 className="mt-2 font-display text-2xl font-bold text-ocean-900 sm:text-3xl">
            Guides
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-ocean-700 sm:text-base">
            Quick reads to help you plan, then book on the main site with live rates and
            WhatsApp support.
          </p>

          {guides.length === 0 ? (
            <p className="mt-5 rounded-xl border border-ocean-100 bg-white p-5 text-sm text-ocean-700">
              New guides will appear here once your team publishes them from the admin panel
              (SEO pages).
            </p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {guides.map((g, index) => {
                const imageSrc =
                  g.imageUrl?.trim() ||
                  GUIDE_FALLBACKS[index % GUIDE_FALLBACKS.length]!;
                return (
                  <li key={g.slug} className="h-full">
                    <Link
                      href={`/guides/${g.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-xl border border-ocean-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
                    >
                      <div className="relative aspect-[16/9] overflow-hidden bg-ocean-100">
                        <CmsRemoteImage
                          src={imageSrc}
                          alt={g.headline}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-3.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-ocean-500">
                          Updated{" "}
                          {new Date(g.updatedAt).toLocaleDateString("en-IN")}
                        </p>
                        <h2 className="mt-1 font-display text-base font-semibold leading-snug text-ocean-900 transition group-hover:text-cyan-800 sm:text-lg">
                          {g.headline}
                        </h2>
                        {g.metaDescription ? (
                          <p className="mt-1.5 line-clamp-2 text-sm text-ocean-700">
                            {g.metaDescription}
                          </p>
                        ) : null}
                        <span className="mt-2.5 text-sm font-bold text-amber-700">
                          Read guide →
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <section
            className="mt-8 rounded-xl border border-ocean-100 bg-white p-5 sm:p-6"
            aria-labelledby="guides-book-heading"
          >
            <h2
              id="guides-book-heading"
              className="font-display text-lg font-bold text-ocean-900 sm:text-xl"
            >
              Ready to book?
            </h2>
            <p className="mt-1.5 text-sm text-ocean-700">
              Compare packages and services, then pay a small advance online to lock your
              slot.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
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

          <section
            className="mt-8 border-t border-ocean-100 pt-8"
            aria-labelledby="guides-faq-heading"
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
              Helpful answers
            </p>
            <h2
              id="guides-faq-heading"
              className="mt-1 font-display text-xl font-bold text-ocean-900 sm:text-2xl"
            >
              Frequently asked questions
            </h2>
            <p className="mt-1.5 text-sm text-ocean-700">
              Quick answers before you plan or book scuba diving in Goa.
            </p>
            <div className="mt-4 space-y-2.5">
              {BOOK_SCUBA_FAQ.slice(0, 6).map((faq, index) => (
                <details
                  key={faq.question}
                  className="group rounded-xl border border-ocean-100 bg-white px-4 shadow-sm open:border-cyan-300 open:bg-cyan-50/40 sm:px-5"
                  open={index === 0}
                >
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-ocean-900 marker:hidden">
                    <span>{faq.question}</span>
                    <span
                      aria-hidden
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand text-lg text-ocean-700 shadow-sm transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="border-t border-ocean-100 pb-4 pt-3 text-sm leading-6 text-ocean-800">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <aside aria-labelledby="guides-blog-sidebar-title" className="min-w-0">
          <div className="lg:sticky lg:top-20">
            <div className="mb-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
                From the blog
              </p>
              <h2
                id="guides-blog-sidebar-title"
                className="mt-0.5 font-display text-xl font-bold text-ocean-900"
              >
                Latest articles
              </h2>
              <p className="mt-0.5 text-sm leading-relaxed text-ocean-700">
                More scuba tips, prices, and planning ideas.
              </p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {sidebarBlogs.map((post, index) => {
                const imageSrc =
                  post.imageUrl?.trim() ||
                  BLOG_FALLBACKS[index % BLOG_FALLBACKS.length]!;
                return (
                  <li key={post.slug}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex flex-col overflow-hidden rounded-xl border border-ocean-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
                    >
                      <div className="relative aspect-[16/9] overflow-hidden bg-ocean-100">
                        <CmsRemoteImage
                          src={imageSrc}
                          alt={post.imageAlt || post.title}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(max-width: 1024px) 50vw, 320px"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-[11px] font-medium text-cyan-700">
                          {post.date} · {post.readTime}
                        </p>
                        <h3 className="mt-1 font-display text-sm font-bold leading-snug text-ocean-900 transition group-hover:text-cyan-800 sm:text-base">
                          {post.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ocean-700">
                          {post.excerpt}
                        </p>
                        <span className="mt-2 inline-flex text-sm font-bold text-amber-700">
                          Read article →
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <Link
              href="/blog"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full border-2 border-ocean-700 px-5 py-2.5 text-sm font-bold text-ocean-800 transition hover:bg-ocean-50"
            >
              View all articles
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
