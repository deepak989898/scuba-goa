import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogContent } from "@/components/BlogContent";
import { BlogHeroGallery } from "@/components/BlogHeroGallery";
import { BlogLivePricing } from "@/components/BlogLivePricing";
import { BlogWhyChooseSection } from "@/components/BlogWhyChooseSection";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { RelatedServicesSidebar } from "@/components/RelatedServicesSidebar";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { SeoDescriptionWithPhone } from "@/components/SeoDescriptionWithPhone";

import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { buildBlogCatalogContext } from "@/lib/blog-automation/catalog-context";
import { buildGuideHeroGalleryData } from "@/lib/blog-hero-gallery";
import { parseBookingOption } from "@/lib/booking-selection";
import { buildGuideFaqs } from "@/lib/guide-faqs";
import { buildHeroBookingHref } from "@/lib/hero-slide-booking";
import { relatedServicesForContent } from "@/lib/related-services-for-content";
import {
  getPublishedSeoPageBySlug,
  getRelatedSeoGuides,
} from "@/lib/seo-pages-server";
import { buildMetaDescriptionWithContact } from "@/lib/seo-meta-description";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

function absAssetUrl(url: string): string {
  const value = url.trim();

  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  const base = SITE_URL.replace(/\/$/, "");

  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
}

function focusSlugFromBookingOption(
  bookingOption: string,
): string | undefined {
  const parsed = parseBookingOption(bookingOption.trim());

  if (!parsed) return undefined;

  if (
    parsed.kind === "service" ||
    parsed.kind === "serviceSub"
  ) {
    return parsed.slug;
  }

  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Metadata                                                                   */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;

  const page = await getPublishedSeoPageBySlug(slug);

  if (!page) {
    return {
      title: "Guide",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const base = SITE_URL.replace(/\/$/, "");

  const canonical = `${base}/guides/${page.slug}`;

  const title =
    page.metaTitle.trim() ||
    `${page.headline} | ${SITE_NAME}`;

  const description = buildMetaDescriptionWithContact(
    page.metaDescription.trim(),
  ).slice(0, 320);

  const ogImage = absAssetUrl(page.ogImageUrl);

  return {
    title,
    description,

    keywords:
      page.keywords.length > 0
        ? page.keywords
        : undefined,

    alternates: {
      canonical,
    },

    openGraph: {
      title:
        page.metaTitle.trim() ||
        page.headline,

      description: description.slice(0, 200),

      type: "article",

      url: canonical,

      siteName: SITE_NAME,

      ...(ogImage
        ? {
            images: [
              {
                url: ogImage,
                alt: page.headline,
              },
            ],
          }
        : {}),
    },

    twitter: {
      card: ogImage
        ? "summary_large_image"
        : "summary",

      title:
        page.metaTitle.trim() ||
        page.headline,

      description: description.slice(0, 200),

      ...(ogImage
        ? {
            images: [ogImage],
          }
        : {}),
    },

    robots: {
      index: true,
      follow: true,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* WebPage JSON-LD                                                            */
/* -------------------------------------------------------------------------- */

function webPageJsonLd(page: {
  headline: string;
  metaDescription: string;
  slug: string;
  ogImageUrl: string;
  updatedAt: string;
}) {
  const base = SITE_URL.replace(/\/$/, "");

  const url = `${base}/guides/${page.slug}`;

  return {
    "@context": "https://schema.org",

    "@type": "WebPage",

    name: page.headline,

    description: page.metaDescription,

    url,

    dateModified: page.updatedAt,

    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: `${base}/`,
    },

    ...(page.ogImageUrl.trim()
      ? {
          primaryImageOfPage: {
            "@type": "ImageObject",
            url: absAssetUrl(page.ogImageUrl),
          },
        }
      : {}),
  };
}

/* -------------------------------------------------------------------------- */
/* Breadcrumb JSON-LD                                                         */
/* -------------------------------------------------------------------------- */

function breadcrumbJsonLd(page: {
  headline: string;
  slug: string;
}) {
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

/* -------------------------------------------------------------------------- */
/* FAQ JSON-LD                                                                */
/* -------------------------------------------------------------------------- */

function faqJsonLd(
  faqs: {
    question: string;
    answer: string;
  }[],
  pageUrl: string,
) {
  return {
    "@context": "https://schema.org",

    "@type": "FAQPage",

    mainEntity: faqs.map((faq) => ({
      "@type": "Question",

      name: faq.question,

      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),

    url: pageUrl,
  };
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function SeoGuidePage({
  params,
}: Props) {
  const { slug } = await params;

  const page = await getPublishedSeoPageBySlug(slug);

  if (!page) {
    notFound();
  }

  const [catalog, related] = await Promise.all([
    buildBlogCatalogContext(),
    getRelatedSeoGuides(slug, 4),
  ]);

  const bookHref = buildHeroBookingHref(
    page.bookingOption.trim()
      ? page.bookingOption
      : undefined,
  );

  const focusServiceSlug =
    focusSlugFromBookingOption(
      page.bookingOption,
    );

  const relatedServices =
    relatedServicesForContent(
      catalog.services,
      {
        title: page.headline,
        keywords: page.keywords,
      },
      focusServiceSlug,
    );

  const heroGallery = buildGuideHeroGalleryData({
    title: page.headline,
    heroPrimary: page.heroImageUrl.trim(),
    heroFallback: page.ogImageUrl.trim(),
    relatedServices,
  });

  const faqs = buildGuideFaqs({
    headline: page.headline,
    metaDescription: page.metaDescription,
    keywords: page.keywords,
  });

  const pageUrl =
    `${SITE_URL.replace(/\/$/, "")}/guides/${page.slug}`;

  const seoDescription = buildMetaDescriptionWithContact(
    page.metaDescription.trim(),
  );

  const updatedLabel =
    page.updatedAt.slice(0, 10);

  return (
    <article className="bg-white py-3 sm:py-4">

      {/* ------------------------------------------------------------------ */}
      {/* Structured Data                                                    */}
      {/* ------------------------------------------------------------------ */}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            webPageJsonLd({
              ...page,
              metaDescription: seoDescription,
            }),
          ),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd(page),
          ),
        }}
      />

      {faqs.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              faqJsonLd(faqs, pageUrl),
            ),
          }}
        />
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Main Layout                                                        */}
      {/* ------------------------------------------------------------------ */}

      <div
        className="
          mx-auto
          grid
          max-w-7xl
          gap-6
          px-4
          sm:px-6
          lg:grid-cols-[minmax(0,1fr)_20rem]
          lg:items-start
          lg:gap-7
          lg:px-8
        "
      >

        {/* ================================================================= */}
        {/* MAIN CONTENT                                                      */}
        {/* ================================================================= */}

        <div className="min-w-0">

          {/* Back + share — above breadcrumb to save vertical space */}
          <div className="flex flex-wrap items-center justify-between gap-2">

            <Link
              href="/guides"
              className="
                inline-flex
                items-center
                text-sm
                font-semibold
                text-ocean-700
                hover:text-ocean-900
              "
            >
              ← All guides
            </Link>

            <SocialShareButtons
              title={
                page.metaTitle.trim() ||
                page.headline
              }
              path={`/guides/${page.slug}`}
              compact
              className="sm:justify-end"
            />

          </div>

          {/* --------------------------------------------------------------- */}
          {/* Breadcrumb                                                      */}
          {/* --------------------------------------------------------------- */}

          <nav
            className="mt-1 text-xs text-ocean-700 sm:text-sm"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="hover:text-ocean-800"
            >
              Home
            </Link>

            <span
              className="mx-2 text-ocean-400"
              aria-hidden="true"
            >
              /
            </span>

            <Link
              href="/guides"
              className="hover:text-ocean-800"
            >
              Guides
            </Link>

            <span
              className="mx-2 text-ocean-400"
              aria-hidden="true"
            >
              /
            </span>

            <span className="text-ocean-500 line-clamp-1">
              {page.headline}
            </span>
          </nav>

          {/* --------------------------------------------------------------- */}
          {/* Article Header                                                   */}
          {/* --------------------------------------------------------------- */}

          <header className="mt-2 sm:mt-2.5">

            <div className="flex flex-col gap-1">

              <h1
                className="
                  font-display
                  text-xl
                  font-extrabold
                  leading-tight
                  text-ocean-900
                  sm:text-2xl
                  lg:text-3xl
                "
              >
                {page.headline}
              </h1>

              <p className="text-sm text-ocean-500">
                Updated {updatedLabel}
              </p>

            </div>

            {/* Hero + attached service photos (same pattern as blog) */}
            {heroGallery.mainUrl || heroGallery.serviceThumbs.length > 0 ? (
              <div className="mt-3">
                <BlogHeroGallery
                  mainUrl={heroGallery.mainUrl}
                  mainFallback={heroGallery.mainFallback}
                  mainAlt={heroGallery.mainAlt}
                  serviceThumbs={heroGallery.serviceThumbs}
                  layout="bounded"
                  priority
                />
              </div>
            ) : null}

            {/* Short Answer / Summary */}
            {page.metaDescription.trim() ? (
              <div
                className="
                  mt-4
                  rounded-xl
                  border-l-4
                  border-amber-400
                  bg-amber-50
                  px-4
                  py-3
                  sm:px-5
                "
              >
                <p className="text-sm font-semibold text-ocean-900">
                  Quick answer
                </p>

                <p className="mt-1 text-sm leading-6 text-ocean-800 sm:text-base">
                  <SeoDescriptionWithPhone description={seoDescription} />
                </p>
              </div>
            ) : null}

          </header>

          {/* --------------------------------------------------------------- */}
          {/* Main Guide Content                                               */}
          {/* --------------------------------------------------------------- */}

          {page.bodyContent.trim() ? (
            <section
              aria-labelledby="guide-content-heading"
              className="mt-7"
            >

              <h2
                id="guide-content-heading"
                className="sr-only"
              >
                {page.headline} guide
              </h2>

              <div
                className="
                  prose
                  prose-ocean
                  max-w-none
                  text-ocean-800
                  prose-headings:font-display
                  prose-headings:font-bold
                  prose-headings:text-ocean-900
                  prose-h2:mt-8
                  prose-h2:text-2xl
                  prose-h3:mt-6
                  prose-h3:text-xl
                  prose-p:leading-7
                  prose-li:leading-7
                  prose-a:font-semibold
                  prose-a:text-ocean-700
                  prose-a:no-underline
                  hover:prose-a:underline
                "
              >
                <BlogContent
                  content={page.bodyContent}
                />
              </div>

            </section>
          ) : (
            <div
              className="
                mt-6
                rounded-xl
                border
                border-ocean-100
                bg-sand
                p-5
                text-sm
                text-ocean-700
              "
            >
              This guide is being updated. Please check back soon
              for the latest information.
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* Live Pricing                                                     */}
          {/* --------------------------------------------------------------- */}

          <section
            aria-label="Current activity pricing"
            className="mt-8"
          >
            <BlogLivePricing
              focusServiceSlug={
                focusServiceSlug
              }
            />
          </section>

          {/* --------------------------------------------------------------- */}
          {/* Why Choose Us                                                    */}
          {/* --------------------------------------------------------------- */}

          <section
            aria-label="Why book with us"
            className="mt-8"
          >
            <BlogWhyChooseSection />
          </section>

          {/* --------------------------------------------------------------- */}
          {/* FAQ                                                              */}
          {/* --------------------------------------------------------------- */}

          {faqs.length > 0 ? (
            <section
              className="
                mt-10
                border-t
                border-ocean-100
                pt-8
              "
              aria-labelledby="guide-faq-heading"
            >

              <p
                className="
                  text-xs
                  font-extrabold
                  uppercase
                  tracking-[0.16em]
                  text-cyan-700
                "
              >
                Helpful answers
              </p>

              <h2
                id="guide-faq-heading"
                className="
                  mt-1
                  font-display
                  text-xl
                  font-bold
                  text-ocean-900
                  sm:text-2xl
                "
              >
                Frequently Asked Questions
              </h2>

              <p className="mt-2 text-sm leading-6 text-ocean-700">
                Find quick answers about pricing, location,
                booking, safety and other important details
                related to this activity.
              </p>

              <div className="mt-5 space-y-3">

                {faqs.map((faq, index) => (
                  <details
                    key={faq.question}
                    className="
                      group
                      rounded-xl
                      border
                      border-ocean-100
                      bg-sand
                      px-4
                      shadow-sm
                      open:border-cyan-300
                      open:bg-cyan-50/40
                      sm:px-5
                    "
                    open={index === 0}
                  >

                    <summary
                      className="
                        flex
                        min-h-12
                        cursor-pointer
                        list-none
                        items-center
                        justify-between
                        gap-4
                        py-3
                        font-semibold
                        text-ocean-900
                        marker:hidden
                      "
                    >

                      <span>
                        {faq.question}
                      </span>

                      <span
                        aria-hidden="true"
                        className="
                          flex
                          h-7
                          w-7
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                          bg-white
                          text-lg
                          text-ocean-700
                          shadow-sm
                          transition
                          group-open:rotate-45
                        "
                      >
                        +
                      </span>

                    </summary>

                    <div
                      className="
                        border-t
                        border-ocean-100
                        pb-4
                        pt-3
                      "
                    >
                      <p className="text-sm leading-6 text-ocean-800">
                        {faq.answer}
                      </p>
                    </div>

                  </details>
                ))}

              </div>

            </section>
          ) : null}

          {/* --------------------------------------------------------------- */}
          {/* Related Guides                                                   */}
          {/* --------------------------------------------------------------- */}

          {related.length > 0 ? (
            <section
              className="
                mt-10
                border-t
                border-ocean-100
                pt-8
              "
              aria-labelledby="related-guides-heading"
            >

              <p
                className="
                  text-xs
                  font-extrabold
                  uppercase
                  tracking-[0.16em]
                  text-amber-700
                "
              >
                Continue exploring
              </p>

              <h2
                id="related-guides-heading"
                className="
                  mt-1
                  font-display
                  text-xl
                  font-bold
                  text-ocean-900
                  sm:text-2xl
                "
              >
                Related Goa Guides
              </h2>

              <p className="mt-2 text-sm text-ocean-700">
                Explore more Goa activities, travel tips and
                booking guides.
              </p>

              <ul className="mt-5 grid gap-4 sm:grid-cols-2">

                {related.map((guide, index) => {

                  const fallbackImage =
                    relatedServices[
                      index %
                        Math.max(
                          relatedServices.length,
                          1,
                        )
                    ]?.image ||
                    catalog.services[
                      index %
                        Math.max(
                          catalog.services.length,
                          1,
                        )
                    ]?.image ||
                    "";

                  const cardImage =
                    guide.imageUrl ||
                    fallbackImage;

                  return (
                    <li
                      key={guide.slug}
                      className="h-full"
                    >

                      <Link
                        href={`/guides/${guide.slug}`}
                        className="
                          group
                          flex
                          h-full
                          flex-col
                          overflow-hidden
                          rounded-xl
                          border
                          border-ocean-100
                          bg-sand
                          shadow-sm
                          transition
                          hover:-translate-y-0.5
                          hover:border-cyan-300
                          hover:shadow-md
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-cyan-500
                        "
                      >

                        {cardImage ? (
                          <div
                            className="
                              relative
                              aspect-[16/9]
                              overflow-hidden
                              bg-ocean-100
                            "
                          >
                            <CmsRemoteImage
                              src={cardImage}
                              alt={guide.headline}
                              fill
                              className="
                                object-cover
                                transition
                                duration-500
                                group-hover:scale-105
                              "
                              sizes="
                                (max-width: 640px) 100vw,
                                (max-width: 1024px) 50vw,
                                360px
                              "
                              loading="lazy"
                            />
                          </div>
                        ) : null}

                        <div className="flex flex-1 flex-col p-4">

                          <p className="text-[11px] font-medium text-cyan-700">
                            Updated{" "}
                            {guide.updatedAt.slice(0, 10)}
                          </p>

                          <h3
                            className="
                              mt-1
                              font-display
                              text-base
                              font-bold
                              leading-snug
                              text-ocean-900
                              transition
                              group-hover:text-cyan-700
                              sm:text-lg
                            "
                          >
                            {guide.headline}
                          </h3>

                          {guide.metaDescription ? (
                            <p
                              className="
                                mt-1.5
                                line-clamp-3
                                text-sm
                                leading-relaxed
                                text-ocean-700
                              "
                            >
                              <SeoDescriptionWithPhone
                                description={buildMetaDescriptionWithContact(
                                  guide.metaDescription,
                                )}
                              />
                            </p>
                          ) : null}

                          <span
                            className="
                              mt-3
                              inline-flex
                              items-center
                              gap-1
                              text-sm
                              font-bold
                              text-amber-700
                            "
                          >
                            Read guide
                            <span aria-hidden="true">
                              →
                            </span>
                          </span>

                        </div>

                      </Link>

                    </li>
                  );
                })}

              </ul>

            </section>
          ) : null}

          {/* --------------------------------------------------------------- */}
          {/* Booking CTA                                                      */}
          {/* --------------------------------------------------------------- */}

          <section
            className="
              mt-10
              rounded-2xl
              border
              border-cyan-100
              bg-ocean-50
              p-5
              sm:p-6
            "
            aria-labelledby="guide-book-heading"
          >

            <p
              className="
                text-xs
                font-extrabold
                uppercase
                tracking-[0.16em]
                text-cyan-700
              "
            >
              Ready to plan?
            </p>

            <h2
              id="guide-book-heading"
              className="
                mt-1
                font-display
                text-xl
                font-bold
                text-ocean-900
                sm:text-2xl
              "
            >
              Book your Goa experience
            </h2>

            <p
              className="
                mt-2
                max-w-2xl
                text-sm
                leading-6
                text-ocean-700
              "
            >
              Check available packages, current prices and
              booking options before you choose your activity.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">

              <Link
                href={bookHref}
                className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-full
                  bg-ocean-gradient
                  px-5
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  shadow-sm
                  hover:opacity-95
                "
              >
                Book now
              </Link>

              <Link
                href="/services"
                className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-ocean-300
                  bg-white
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-ocean-800
                  hover:border-ocean-400
                "
              >
                All activities
              </Link>

              <Link
                href="/contact"
                className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-ocean-200
                  bg-white
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-ocean-700
                  hover:border-ocean-400
                "
              >
                Contact us
              </Link>

            </div>

          </section>

        </div>

        {/* ================================================================= */}
        {/* SIDEBAR                                                           */}
        {/* ================================================================= */}

        <aside
          aria-label="Related activities"
          className="min-w-0"
        >
          <RelatedServicesSidebar
            services={relatedServices}
          />
        </aside>

      </div>

    </article>
  );
}