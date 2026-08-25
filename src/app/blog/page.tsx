import type { Metadata } from "next";
import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { ListPagination } from "@/components/ListPagination";
import { SeoDescriptionWithPhone } from "@/components/SeoDescriptionWithPhone";
import { PRIMARY_SEO_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/constants";
import { listPublishedBlogPostsServer } from "@/lib/blog-posts-server";
import { getAllBlogPostsMerged } from "@/lib/blog-posts-unified";
import { blogFeaturedImageOrPlaceholder } from "@/lib/cms-image";
import { getPageSlice, LIST_PAGE_SIZE } from "@/lib/list-pagination";
import { BOOK_SCUBA_FAQ, faqPageJsonLd } from "@/lib/seo-health/faq-data";
import { listPublishedSeoPagesServer } from "@/lib/seo-pages-server";
import { buildMetaDescriptionWithContact } from "@/lib/seo-meta-description";

/** Public /blog index: only 3 pages of highest-view posts. */
const BLOG_LIST_MAX_PAGES = 3;

export const revalidate = 3600;

type Props = { searchParams: Promise<{ page?: string }> };

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

export default async function BlogIndexPage({ searchParams }: Props) {
  const sp = await searchParams;
  const [merged, guides, fsPosts] = await Promise.all([
    getAllBlogPostsMerged(),
    listPublishedSeoPagesServer(),
    listPublishedBlogPostsServer(),
  ]);
  const viewsBySlug = new Map<string, number>();
  for (const p of fsPosts) {
    viewsBySlug.set(
      p.slug,
      Math.max(0, Math.round(Number(p.viewCount ?? 0))),
    );
  }
  // Highest views first; only top 3 pages are listed publicly.
  const byViews = [...merged].sort((a, b) => {
    const va = viewsBySlug.get(a.slug) ?? 0;
    const vb = viewsBySlug.get(b.slug) ?? 0;
    if (vb !== va) return vb - va;
    return b.date.localeCompare(a.date) || a.title.localeCompare(b.title);
  });
  const capped = byViews.slice(0, LIST_PAGE_SIZE * BLOG_LIST_MAX_PAGES);
  const slice = getPageSlice(capped.length, sp.page);
  const pagePosts = capped.slice(slice.start, slice.end);
  const sidebarGuides = guides.slice(0, 5);
  const faqLd = faqPageJsonLd(BOOK_SCUBA_FAQ.slice(0, 6));

  return (
    <div className="bg-sand/30 py-3 sm:py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <div className="mx-auto grid max-w-7xl gap-3 px-3 sm:px-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-4 lg:px-6">
        <div className="min-w-0">
          <nav className="text-xs text-ocean-700 sm:text-sm" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ocean-800">
              Home
            </Link>
            <span className="mx-1.5 text-ocean-400">/</span>
            <span className="text-ocean-500">Blog</span>
          </nav>
          <h1 className="mt-1 font-display text-xl font-bold text-ocean-900 sm:text-2xl">
            Scuba diving in Goa — guides & blog
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-snug text-ocean-700">
            Start with pillar guides (best time, safety, island trip, 2026 prices), then
            explore planning articles — each links to live booking.
          </p>

          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {pagePosts.map((p, index) => {
              const imageSrc = blogFeaturedImageOrPlaceholder(p.slug, p.title, p.imageUrl);
              return (
                <li key={p.slug} className="h-full">
                  <Link
                    href={`/blog/${p.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-ocean-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-ocean-100">
                      <CmsRemoteImage
                        src={imageSrc}
                        alt={p.imageAlt || p.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-0">
                        <h2 className="min-w-0 flex-1 font-display text-sm font-semibold leading-snug text-ocean-900 transition group-hover:text-cyan-800 sm:text-base">
                          {p.title}
                        </h2>
                        <p className="shrink-0 text-[10px] font-medium text-ocean-500 sm:text-right">
                          {p.date} · {p.readTime}
                        </p>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-ocean-700 sm:text-sm">
                        <SeoDescriptionWithPhone
                          description={buildMetaDescriptionWithContact(p.excerpt)}
                        />
                      </p>
                      {p.keywords.length > 0 ? (
                        <p className="mt-1 line-clamp-1 text-[10px] text-ocean-500">
                          {p.keywords.slice(0, 4).join(" · ")}
                        </p>
                      ) : null}
                      <span className="mt-1.5 text-xs font-bold text-amber-700 sm:text-sm">
                        Read article →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <ListPagination
            basePath="/blog"
            page={slice.page}
            totalPages={slice.totalPages}
            totalItems={slice.totalItems}
            start={slice.start}
            end={slice.end}
            itemLabel="articles"
            hideStatus
            maxPages={BLOG_LIST_MAX_PAGES}
          />

          <section
            className="mt-5 rounded-lg border border-ocean-100 bg-white p-3 sm:p-4"
            aria-labelledby="blog-book-heading"
          >
            <h2
              id="blog-book-heading"
              className="font-display text-base font-bold text-ocean-900 sm:text-lg"
            >
              Ready to book?
            </h2>
            <p className="mt-1 text-sm text-ocean-700">
              Compare packages and services, then pay a small advance online to lock your
              slot.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Link
                href="/booking"
                className="inline-flex rounded-full bg-ocean-gradient px-4 py-2 text-sm font-bold text-white hover:opacity-95"
              >
                Book now
              </Link>
              <Link
                href="/guides"
                className="inline-flex rounded-full border border-ocean-200 px-4 py-2 text-sm font-semibold text-ocean-800 hover:border-ocean-400"
              >
                Travel guides
              </Link>
            </div>
          </section>

          <section
            className="mt-5 border-t border-ocean-100 pt-4"
            aria-labelledby="blog-faq-heading"
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-cyan-700">
              Helpful answers
            </p>
            <h2
              id="blog-faq-heading"
              className="mt-0.5 font-display text-lg font-bold text-ocean-900 sm:text-xl"
            >
              Frequently asked questions
            </h2>
            <p className="mt-1 text-sm text-ocean-700">
              Quick answers before you plan or book scuba diving in Goa.
            </p>
            <div className="mt-2.5 space-y-1.5">
              {BOOK_SCUBA_FAQ.slice(0, 6).map((faq, index) => (
                <details
                  key={faq.question}
                  className="group rounded-lg border border-ocean-100 bg-white px-3 shadow-sm open:border-cyan-300 open:bg-cyan-50/40 sm:px-4"
                  open={index === 0}
                >
                  <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-semibold text-ocean-900 marker:hidden">
                    <span>{faq.question}</span>
                    <span
                      aria-hidden
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sand text-base text-ocean-700 shadow-sm transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="border-t border-ocean-100 pb-2.5 pt-2 text-sm leading-snug text-ocean-800">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <aside aria-labelledby="blog-guides-sidebar-title" className="min-w-0">
          <div className="lg:sticky lg:top-16">
            <div className="mb-2">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-cyan-700">
                Explore more Goa
              </p>
              <h2
                id="blog-guides-sidebar-title"
                className="mt-0.5 font-display text-lg font-bold text-ocean-900"
              >
                Travel guides
              </h2>
              <p className="mt-0.5 text-xs leading-snug text-ocean-700 sm:text-sm">
                Short planning pages before you book.
              </p>
            </div>

            {sidebarGuides.length === 0 ? (
              <p className="rounded-lg border border-ocean-100 bg-white p-3 text-sm text-ocean-700">
                Guides will appear here when published.
              </p>
            ) : (
              <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
                {sidebarGuides.map((g) => {
                  const imageSrc = blogFeaturedImageOrPlaceholder(g.slug, g.headline, g.imageUrl);
                  return (
                    <li key={g.slug}>
                      <Link
                        href={`/guides/${g.slug}`}
                        className="group flex flex-col overflow-hidden rounded-lg border border-ocean-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
                      >
                        <div className="relative aspect-[16/9] overflow-hidden bg-ocean-100">
                          <CmsRemoteImage
                            src={imageSrc}
                            alt={g.headline}
                            fill
                            className="object-cover transition duration-500 group-hover:scale-105"
                            sizes="(max-width: 1024px) 50vw, 320px"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-2.5">
                          <p className="text-[10px] font-medium text-cyan-700">
                            Updated {g.updatedAt.slice(0, 10)}
                          </p>
                          <h3 className="mt-0.5 font-display text-sm font-bold leading-snug text-ocean-900 transition group-hover:text-cyan-800">
                            {g.headline}
                          </h3>
                          {g.metaDescription ? (
                            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-ocean-700">
                              <SeoDescriptionWithPhone
                                description={buildMetaDescriptionWithContact(
                                  g.metaDescription,
                                )}
                              />
                            </p>
                          ) : null}
                          <span className="mt-1.5 inline-flex text-xs font-bold text-amber-700 sm:text-sm">
                            Read guide →
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            <Link
              href="/guides"
              className="mt-2.5 inline-flex min-h-10 w-full items-center justify-center rounded-full border-2 border-ocean-700 px-4 py-2 text-sm font-bold text-ocean-800 transition hover:bg-ocean-50"
            >
              View all guides
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
