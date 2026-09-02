import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BlogContent } from "@/components/BlogContent";
import { BlogLivePricing } from "@/components/BlogLivePricing";
import { BlogWhyChooseSection } from "@/components/BlogWhyChooseSection";
import { BlogTrustBlock } from "@/components/BlogTrustBlock";
import { buildBlogCatalogContext } from "@/lib/blog-automation/catalog-context";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import {
  getBlogPostBySlugMerged,
  getRelatedBlogPostsMerged,
} from "@/lib/blog-posts-unified";
import {
  getPublishedBlogPostBySlug,
  listPublishedBlogSlugsServer,
} from "@/lib/blog-posts-server";
import { RelatedServicesSidebar } from "@/components/RelatedServicesSidebar";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { relatedServicesForContent } from "@/lib/related-services-for-content";
import { packageOfferCatalogJsonLd } from "@/lib/blog-seo/package-offer-jsonld";
import { stripUndefinedJsonLd } from "@/lib/blog-seo/json-ld";
import { findBlogRedirectDestination } from "@/lib/blog-redirects";
import { getSeoBlogRedirect } from "@/lib/gsc-indexing-agent/seo-blog-redirects";
import { encodeServiceBaseOption } from "@/lib/booking-selection";
import { buildHeroBookingHref } from "@/lib/hero-slide-booking";
import { BlogHeroGallery } from "@/components/BlogHeroGallery";
import { buildBlogHeroGalleryData, resolveBlogFocusService } from "@/lib/blog-hero-gallery";
import { SeoDescriptionWithPhone } from "@/components/SeoDescriptionWithPhone";
import { buildMetaDescriptionWithContact } from "@/lib/seo-meta-description";
import {
  blogFeaturedImageOrPlaceholder,
  resolveBlogFeaturedImages,
} from "@/lib/cms-image";

const blogBookNowClass =
  "inline-flex min-h-10 touch-manipulation items-center justify-center rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-5 py-2 text-sm font-extrabold text-white shadow-lg shadow-orange-500/40 ring-2 ring-amber-200/70 transition hover:brightness-110 active:brightness-95";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateStaticParams() {
  const fsSlugs = await listPublishedBlogSlugsServer();
  return fsSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getBlogPostBySlugMerged(slug);
  if (!p) return { title: "Article" };
  const fs = await getPublishedBlogPostBySlug(slug);
  const canonical = `${SITE_URL.replace(/\/$/, "")}/blog/${p.slug}`;
  // Absolute title (no layout template double-branding)
  const title =
    fs?.metaTitle?.trim() ||
    p.metaTitle?.trim() ||
    p.title;
  const description = buildMetaDescriptionWithContact(
    fs?.metaDescription?.trim() || p.excerpt,
  );
  const ogImage = blogFeaturedImageOrPlaceholder(
    slug,
    p.title,
    fs?.ogImageUrl,
    fs?.featuredImageUrl,
    p.imageUrl,
  );
  const ogAlt = fs?.featuredImageAlt?.trim() || p.imageAlt?.trim() || p.title;
  const publishedTime = fs?.publishedAt?.slice(0, 10) || p.date;
  const modifiedTime = fs?.updatedAt?.slice(0, 10) || p.updatedAt || p.date;

  return {
    title: { absolute: title },
    description,
    keywords: fs?.keywords?.length ? fs.keywords : p.keywords,
    authors: [{ name: SITE_NAME }],
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      siteName: SITE_NAME,
      locale: "en_IN",
      publishedTime,
      modifiedTime,
      images: [{ url: ogImage, alt: ogAlt, width: 1600, height: 900 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
    other: {
      "article:section": "Scuba diving",
      "article:tag": (fs?.keywords?.length ? fs.keywords : p.keywords)
        .slice(0, 8)
        .join(", "),
    },
  };
}

function faqJsonLd(
  faqs: { question: string; answer: string }[],
  pageUrl: string,
) {
  return stripUndefinedJsonLd({
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
  });
}

const SITE_LOGO = `${SITE_URL.replace(/\/$/, "")}/book-scuba-goa-logo.png`;

function blogPostingJsonLd(p: {
  title: string;
  excerpt: string;
  date: string;
  dateModified: string;
  slug: string;
  keywords?: string[];
  imageUrl?: string;
  language?: string;
}) {
  const url = `${SITE_URL.replace(/\/$/, "")}/blog/${p.slug}`;
  const lang =
    p.language === "hi" ? "hi" : p.language === "hinglish" ? "en-IN" : "en-IN";
  return stripUndefinedJsonLd({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": url,
    url,
    headline: p.title,
    description: p.excerpt,
    datePublished: p.date,
    dateModified: p.dateModified,
    inLanguage: lang,
    keywords: p.keywords?.length ? p.keywords.join(", ") : undefined,
    ...(p.imageUrl
      ? {
          image: {
            "@type": "ImageObject",
            url: p.imageUrl,
          },
        }
      : {}),
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL.replace(/\/$/, ""),
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: SITE_LOGO },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  });
}

function breadcrumbJsonLd(p: { title: string; slug: string }) {
  const base = SITE_URL.replace(/\/$/, "");
  return stripUndefinedJsonLd({
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
        name: "Blog",
        item: `${base}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: p.title,
        item: `${base}/blog/${p.slug}`,
      },
    ],
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const blogPath = `/blog/${slug}`;

  const p = await getBlogPostBySlugMerged(slug);
  if (!p) {
    const fsRedirect = await getSeoBlogRedirect(blogPath);
    if (fsRedirect) permanentRedirect(fsRedirect);

    const dest = findBlogRedirectDestination(blogPath);
    if (dest) permanentRedirect(dest);
    notFound();
  }
  const [fs, related, catalog] = await Promise.all([
    getPublishedBlogPostBySlug(slug),
    getRelatedBlogPostsMerged(slug, 6),
    buildBlogCatalogContext(),
  ]);

  const pageUrl = `${SITE_URL.replace(/\/$/, "")}/blog/${p.slug}`;
  const faqs = p.faqs ?? [];
  const featuredImages = resolveBlogFeaturedImages(
    p.slug,
    p.title,
    fs?.featuredImageUrl,
    fs?.ogImageUrl,
    p.imageUrl,
  );
  const featuredImage =
    featuredImages.primary || featuredImages.fallback;
  const featuredImageAlt =
    fs?.featuredImageAlt?.trim() || p.imageAlt?.trim() || p.title;
  const seoDescription = buildMetaDescriptionWithContact(
    fs?.metaDescription?.trim() || p.excerpt,
  );
  const dateModified = fs?.updatedAt?.slice(0, 10) ?? p.updatedAt ?? p.date;
  const publishedLabel = (fs?.publishedAt || p.date || "").slice(0, 10);
  const focusServiceSlug = fs?.serviceSlug?.trim() || undefined;
  const bookHref = focusServiceSlug
    ? buildHeroBookingHref(encodeServiceBaseOption(focusServiceSlug))
    : "/booking";
  const relatedServices = relatedServicesForContent(
    catalog.services,
    p,
    focusServiceSlug,
    4,
  );
  const focusService = resolveBlogFocusService(
    catalog.services,
    relatedServices,
    focusServiceSlug,
    { title: p.title, keywords: p.keywords },
  );
  const heroGallery = buildBlogHeroGalleryData({
    title: p.title,
    featuredPrimary: featuredImages.primary,
    featuredFallback: featuredImages.fallback,
    focusService,
  });
  const offerListLd = packageOfferCatalogJsonLd(catalog.packages, pageUrl, {
    fallbackImageUrl: featuredImage,
  });

  return (
    <article className="bg-white py-2 sm:py-3">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            blogPostingJsonLd({
              title: p.title,
              excerpt: seoDescription,
              date: publishedLabel || p.date,
              dateModified,
              slug: p.slug,
              keywords: p.keywords,
              imageUrl: featuredImage,
              language: fs?.language,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(p)),
        }}
      />
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd(faqs, pageUrl)),
          }}
        />
      )}
      {offerListLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(offerListLd),
          }}
        />
      ) : null}
      <div className="mx-auto grid max-w-7xl gap-3 px-3 sm:px-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-4 lg:px-6">
        <div className="min-w-0">
          <nav
            className="flex flex-wrap items-center gap-x-1.5 gap-y-0 text-xs text-ocean-700"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-ocean-800">
              Home
            </Link>
            <span className="text-ocean-400">/</span>
            <Link href="/blog" className="hover:text-ocean-800">
              Blog
            </Link>
            <span className="text-ocean-400">/</span>
            <span className="truncate text-ocean-500">{p.title}</span>
            <span className="text-ocean-300" aria-hidden>
              ·
            </span>
            <Link
              href="/blog"
              className="font-semibold text-ocean-700 hover:text-ocean-800"
            >
              ← All articles
            </Link>
          </nav>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-x-2 gap-y-0">
            <h1 className="min-w-0 flex-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text font-display text-lg font-extrabold leading-snug text-transparent sm:text-xl lg:text-2xl">
              {p.title}
            </h1>
            <p className="shrink-0 pt-0.5 text-[11px] text-ocean-500 sm:text-xs sm:text-right">
              {p.date} · {p.readTime}
            </p>
          </div>

          <BlogHeroGallery
            mainUrl={heroGallery.mainUrl}
            mainFallback={heroGallery.mainFallback}
            mainAlt={heroGallery.mainAlt}
            serviceThumbs={heroGallery.serviceThumbs}
            priority
          />

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0 flex-1">
              <BlogTrustBlock
                publishedAt={publishedLabel || undefined}
                updatedAt={dateModified}
              />
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              <Link href={bookHref} className={blogBookNowClass}>
                Book Now
              </Link>
              <Link
                href="/services"
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-ocean-200 bg-white px-4 py-2 text-sm font-bold text-ocean-800 shadow-sm transition hover:bg-ocean-50"
              >
                View services
              </Link>
            </div>
          </div>

          <p className="mt-1.5 border-l-4 border-amber-400 bg-amber-50/90 py-1.5 pl-2.5 text-sm leading-snug text-slate-800">
            <SeoDescriptionWithPhone
              description={seoDescription}
              className="text-slate-800"
              phoneClassName="font-bold text-orange-700 hover:text-orange-800 underline-offset-2 hover:underline"
            />
          </p>

          <div className="prose prose-ocean mt-2 max-w-none text-ocean-800 prose-headings:font-display prose-a:text-ocean-700 prose-p:my-2 prose-headings:mb-1.5 prose-headings:mt-4">
            <BlogContent content={p.content} />
          </div>

          <BlogLivePricing focusServiceSlug={focusServiceSlug} />

          <BlogWhyChooseSection />

          {faqs.length > 0 && (
            <section
              className="mt-5 border-t border-ocean-100 pt-4"
              aria-labelledby="faq-heading"
            >
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-cyan-700">
                Helpful answers
              </p>
              <h2
                id="faq-heading"
                className="mt-0.5 font-display text-lg font-bold text-ocean-900 sm:text-xl"
              >
                Frequently asked questions
              </h2>
              <p className="mt-1 text-sm leading-snug text-ocean-700">
                Open any question for a quick answer before planning or booking.
              </p>
              <div className="mt-2.5 space-y-1.5">
                {faqs.map((f, index) => (
                  <details
                    key={f.question}
                    className="group rounded-lg border border-ocean-100 bg-sand px-3 shadow-sm open:border-cyan-300 open:bg-cyan-50/40 sm:px-4"
                    open={index === 0}
                  >
                    <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-semibold text-ocean-900 marker:hidden">
                      <span>{f.question}</span>
                      <span
                        aria-hidden
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-base text-ocean-700 shadow-sm transition group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="border-t border-ocean-100 pb-2.5 pt-2 text-sm leading-snug text-ocean-800">
                      {f.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {related.length > 0 && (
            <section
              className="mt-5 border-t border-ocean-100 pt-4"
              aria-labelledby="related-articles-heading"
            >
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-700">
                Continue exploring
              </p>
              <h2
                id="related-articles-heading"
                className="mt-0.5 font-display text-lg font-bold text-ocean-900 sm:text-xl"
              >
                Related articles
              </h2>
              <p className="mt-1 text-sm text-ocean-700">
                Keep reading this topic cluster before booking.
              </p>
              <ul className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                {related.map((r) => {
                  const cardImage = blogFeaturedImageOrPlaceholder(r.slug, r.title, r.imageUrl);
                  return (
                    <li key={r.slug} className="h-full">
                      <Link
                        href={`/blog/${r.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-lg border border-ocean-100 bg-sand shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                      >
                        <div className="relative aspect-[16/9] overflow-hidden bg-ocean-100">
                          <CmsRemoteImage
                            src={cardImage}
                            alt={r.imageAlt || r.title}
                            fill
                            className="object-cover transition duration-500 group-hover:scale-105"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex flex-1 flex-col p-2.5">
                          <p className="text-[10px] font-medium text-cyan-700">
                            {r.date} · {r.readTime}
                          </p>
                          <h3 className="mt-0.5 font-display text-sm font-bold leading-snug text-ocean-900 transition group-hover:text-cyan-700 sm:text-base">
                            {r.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-xs leading-snug text-ocean-700 sm:text-sm">
                            <SeoDescriptionWithPhone
                              description={buildMetaDescriptionWithContact(
                                r.excerpt,
                              )}
                            />
                          </p>
                          <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-amber-700 sm:text-sm">
                            Read article <span aria-hidden>→</span>
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section
            className="mt-5 rounded-lg border border-ocean-100 bg-ocean-50/50 p-3 sm:p-4"
            aria-labelledby="related-links-heading"
          >
            <h2
              id="related-links-heading"
              className="font-display text-base font-bold text-ocean-900 sm:text-lg"
            >
              Book & explore more
            </h2>
            <p className="mt-1 text-sm text-ocean-700">
              Continue planning on our main pages — live packages and clear reporting
              times.
            </p>
            <ul className="mt-2.5 flex flex-wrap gap-2 text-sm font-semibold">
              <li>
                <Link href={bookHref} className={blogBookNowClass}>
                  Book Now
                </Link>
              </li>
              <li>
                <Link
                  href="/services/scuba-diving"
                  className="inline-flex rounded-full border border-ocean-300 bg-white px-4 py-2 text-ocean-800 hover:border-ocean-400"
                >
                  Scuba diving
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="inline-flex rounded-full border border-ocean-200 bg-white px-4 py-2 text-ocean-700 hover:border-ocean-400"
                >
                  All services
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="inline-flex rounded-full border border-ocean-200 bg-white px-4 py-2 text-ocean-700 hover:border-ocean-400"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </section>

          {/* Mobile: related services below article */}
          <div className="mt-5 border-t border-ocean-100 pt-4 lg:hidden">
            <RelatedServicesSidebar
              services={relatedServices}
              showScarcity={false}
              compact
            />
          </div>
        </div>

        <aside className="hidden min-w-0 lg:sticky lg:top-16 lg:block lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-4">
          <RelatedServicesSidebar
            services={relatedServices}
            showScarcity={false}
            compact
          />
        </aside>
      </div>
    </article>
  );
}
