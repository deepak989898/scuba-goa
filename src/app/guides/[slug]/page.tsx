import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogContent } from "@/components/BlogContent";
import { BlogLivePricing } from "@/components/BlogLivePricing";
import { BlogWhyChooseSection } from "@/components/BlogWhyChooseSection";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { RelatedServicesSidebar } from "@/components/RelatedServicesSidebar";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { buildBlogCatalogContext } from "@/lib/blog-automation/catalog-context";
import { parseBookingOption } from "@/lib/booking-selection";
import { buildGuideFaqs } from "@/lib/guide-faqs";
import { buildHeroBookingHref } from "@/lib/hero-slide-booking";
import { relatedServicesForContent } from "@/lib/related-services-for-content";
import {
  getPublishedSeoPageBySlug,
  getRelatedSeoGuides,
} from "@/lib/seo-pages-server";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

function absAssetUrl(url: string): string {
  const t = url.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  const base = SITE_URL.replace(/\/$/, "");
  return `${base}${t.startsWith("/") ? t : `/${t}`}`;
}

function focusSlugFromBookingOption(bookingOption: string): string | undefined {
  const parsed = parseBookingOption(bookingOption.trim());
  if (!parsed) return undefined;
  if (parsed.kind === "service" || parsed.kind === "serviceSub") return parsed.slug;
  return undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedSeoPageBySlug(slug);
  if (!page) return { title: "Guide", robots: { index: false, follow: false } };

  const base = SITE_URL.replace(/\/$/, "");
  const canonical = `${base}/guides/${page.slug}`;
  const title =
    page.metaTitle.trim() ||
    `${page.headline} | ${SITE_NAME}`;
  const desc = page.metaDescription.trim().slice(0, 320);
  const og = absAssetUrl(page.ogImageUrl);

  return {
    title,
    description: desc,
    keywords: page.keywords.length ? page.keywords : undefined,
    alternates: { canonical },
    openGraph: {
      title: page.metaTitle.trim() || page.headline,
      description: desc.slice(0, 200),
      type: "article",
      url: canonical,
      siteName: SITE_NAME,
      ...(og
        ? {
            images: [
              {
                url: og,
                alt: page.headline,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: og ? "summary_large_image" : "summary",
      title: page.metaTitle.trim() || page.headline,
      description: desc.slice(0, 200),
      ...(og ? { images: [og] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

function webPageJsonLd(page: {
  headline: string;
  metaDescription: string;
  slug: string;
  ogImageUrl: string;
}) {
  const base = SITE_URL.replace(/\/$/, "");
  const url = `${base}/guides/${page.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.headline,
    description: page.metaDescription,
    url,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: `${base}/` },
    ...(page.ogImageUrl.trim()
      ? { primaryImageOfPage: { "@type": "ImageObject", url: absAssetUrl(page.ogImageUrl) } }
      : {}),
  };
}

function breadcrumbJsonLd(page: { headline: string; slug: string }) {
  const base = SITE_URL.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${base}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Guides",
        item: `${base}/guides`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: page.headline,
        item: `${base}/guides/${page.slug}`,
      },
    ],
  };
}

function faqJsonLd(
  faqs: { question: string; answer: string }[],
  pageUrl: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
    url: pageUrl,
  };
}

export default async function SeoGuidePage({ params }: Props) {
  const { slug } = await params;
  const page = await getPublishedSeoPageBySlug(slug);
  if (!page) notFound();

  const [catalog, related] = await Promise.all([
    buildBlogCatalogContext(),
    getRelatedSeoGuides(slug, 4),
  ]);

  const bookHref = buildHeroBookingHref(
    page.bookingOption.trim() ? page.bookingOption : undefined,
  );
  const heroSrc = page.heroImageUrl.trim() || page.ogImageUrl.trim();
  const focusServiceSlug = focusSlugFromBookingOption(page.bookingOption);
  const relatedServices = relatedServicesForContent(
    catalog.services,
    { title: page.headline, keywords: page.keywords },
    focusServiceSlug,
  );
  const faqs = buildGuideFaqs({
    headline: page.headline,
    metaDescription: page.metaDescription,
    keywords: page.keywords,
  });
  const pageUrl = `${SITE_URL.replace(/\/$/, "")}/guides/${page.slug}`;
  const updatedLabel = page.updatedAt.slice(0, 10);

  return (
    <article className="bg-white py-5 sm:py-7">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webPageJsonLd(page)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(page)),
        }}
      />
      {faqs.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd(faqs, pageUrl)),
          }}
        />
      ) : null}

      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-7 lg:px-8">
        <div className="min-w-0">
          <nav className="text-sm text-ocean-700" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ocean-800">
              Home
            </Link>
            <span className="mx-2 text-ocean-400">/</span>
            <Link href="/guides" className="hover:text-ocean-800">
              Guides
            </Link>
            <span className="mx-2 text-ocean-400">/</span>
            <span className="text-ocean-500">{page.headline}</span>
          </nav>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/guides"
              className="inline-block text-sm font-semibold text-ocean-700 hover:text-ocean-800"
            >
              ← All guides
            </Link>
            <SocialShareButtons
              title={page.metaTitle.trim() || page.headline}
              path={`/guides/${page.slug}`}
              compact
              className="sm:justify-end"
            />
          </div>

          <p className="mt-3 text-sm text-ocean-500">Updated {updatedLabel}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold leading-snug text-ocean-900 sm:text-3xl">
            {page.headline}
          </h1>
          <p className="mt-3 border-l-4 border-amber-400 bg-amber-50/60 py-2 pl-3 text-base leading-relaxed text-ocean-800">
            {page.metaDescription}
          </p>

          {heroSrc ? (
            <div className="relative mt-4 aspect-[16/9] max-h-[min(280px,36vh)] w-full overflow-hidden rounded-xl border border-ocean-100 bg-ocean-50 sm:max-h-[320px]">
              <Image
                src={heroSrc}
                alt={page.headline}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 720px"
                priority
              />
            </div>
          ) : null}

          {page.bodyContent.trim() ? (
            <div className="prose prose-ocean mt-6 max-w-none text-ocean-800 prose-headings:font-display prose-a:text-ocean-700">
              <BlogContent content={page.bodyContent} />
            </div>
          ) : null}

          <BlogLivePricing focusServiceSlug={focusServiceSlug} />

          <BlogWhyChooseSection />

          {faqs.length > 0 ? (
            <section
              className="mt-8 border-t border-ocean-100 pt-8"
              aria-labelledby="guide-faq-heading"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
                Helpful answers
              </p>
              <h2
                id="guide-faq-heading"
                className="mt-1 font-display text-xl font-bold text-ocean-900 sm:text-2xl"
              >
                Frequently asked questions
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ocean-700">
                Quick answers before you plan or book.
              </p>
              <div className="mt-4 space-y-2.5">
                {faqs.map((f, index) => (
                  <details
                    key={f.question}
                    className="group rounded-xl border border-ocean-100 bg-sand px-4 shadow-sm open:border-cyan-300 open:bg-cyan-50/40 sm:px-5"
                    open={index === 0}
                  >
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-ocean-900 marker:hidden">
                      <span>{f.question}</span>
                      <span
                        aria-hidden
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-lg text-ocean-700 shadow-sm transition group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="border-t border-ocean-100 pb-4 pt-3 text-sm leading-6 text-ocean-800">
                      {f.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {related.length > 0 ? (
            <section
              className="mt-8 border-t border-ocean-100 pt-8"
              aria-labelledby="related-guides-heading"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-amber-700">
                Continue exploring
              </p>
              <h2
                id="related-guides-heading"
                className="mt-1 font-display text-xl font-bold text-ocean-900 sm:text-2xl"
              >
                Related guides
              </h2>
              <p className="mt-1.5 text-sm text-ocean-700">
                Keep reading before you book.
              </p>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {related.map((r, index) => {
                  const fallbackImage =
                    relatedServices[index % relatedServices.length]?.image ||
                    catalog.services[index % catalog.services.length]?.image ||
                    "";
                  const cardImage = r.imageUrl || fallbackImage;
                  return (
                    <li key={r.slug} className="h-full">
                      <Link
                        href={`/guides/${r.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-xl border border-ocean-100 bg-sand shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                      >
                        {cardImage ? (
                          <div className="relative aspect-[16/9] overflow-hidden bg-ocean-100">
                            <CmsRemoteImage
                              src={cardImage}
                              alt={r.headline}
                              fill
                              className="object-cover transition duration-500 group-hover:scale-105"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                              loading="lazy"
                            />
                          </div>
                        ) : null}
                        <div className="flex flex-1 flex-col p-3.5">
                          <p className="text-[11px] font-medium text-cyan-700">
                            Updated {r.updatedAt.slice(0, 10)}
                          </p>
                          <h3 className="mt-1 font-display text-base font-bold leading-snug text-ocean-900 transition group-hover:text-cyan-700 sm:text-lg">
                            {r.headline}
                          </h3>
                          {r.metaDescription ? (
                            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ocean-700">
                              {r.metaDescription}
                            </p>
                          ) : null}
                          <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-amber-700">
                            Read guide <span aria-hidden>→</span>
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section
            className="mt-8 rounded-xl border border-ocean-100 bg-ocean-50/50 p-5 sm:p-6"
            aria-labelledby="guide-book-heading"
          >
            <h2
              id="guide-book-heading"
              className="font-display text-lg font-bold text-ocean-900 sm:text-xl"
            >
              Book & explore more
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ocean-700">
              Secure checkout with Razorpay, WhatsApp confirmation, and live slots when
              available.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2.5 text-sm font-semibold">
              <li>
                <Link
                  href={bookHref}
                  className="inline-flex rounded-full bg-ocean-gradient px-5 py-2.5 text-white hover:opacity-95"
                >
                  Book now — live rates
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="inline-flex rounded-full border border-ocean-300 bg-white px-5 py-2.5 text-ocean-800 hover:border-ocean-400"
                >
                  All services
                </Link>
              </li>
              <li>
                <Link
                  href="/services/scuba-diving"
                  className="inline-flex rounded-full border border-ocean-200 bg-white px-5 py-2.5 text-ocean-700 hover:border-ocean-400"
                >
                  Scuba diving
                </Link>
              </li>
              <li>
                <Link
                  href="/services/water-sports"
                  className="inline-flex rounded-full border border-ocean-200 bg-white px-5 py-2.5 text-ocean-700 hover:border-ocean-400"
                >
                  Water sports
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="inline-flex rounded-full border border-ocean-200 bg-white px-5 py-2.5 text-ocean-700 hover:border-ocean-400"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </section>
        </div>

        <RelatedServicesSidebar services={relatedServices} />
      </div>
    </article>
  );
}
