import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BlogContent } from "@/components/BlogContent";
import { BlogLivePricing } from "@/components/BlogLivePricing";
import { BlogWhyChooseSection } from "@/components/BlogWhyChooseSection";
import { BlogTrustBlock } from "@/components/BlogTrustBlock";
import { buildBlogCatalogContext } from "@/lib/blog-automation/catalog-context";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { MoreLikeThisSection } from "@/components/MoreLikeThisSection";
import { TopicCtaSection } from "@/components/TopicCtaSection";
import {
  getBlogPostBySlugMerged,
} from "@/lib/blog-posts-unified";
import {
  buildClusterCatalog,
  getMoreLikeThisForBlog,
} from "@/lib/cluster-related-content";
import { enrichMarkdownWithClusterLinks } from "@/lib/contextual-internal-links";
import { getTopicAwareBlogFaqs } from "@/lib/blog-topic-faqs";
import { getTopicCta } from "@/lib/content-clusters";
import {
  getPublishedBlogPostBySlug,
  listPublishedBlogSlugsServer,
} from "@/lib/blog-posts-server";
import {
  pickBlogDisplayUpdatedYmd,
} from "@/lib/blog-firestore";
import { RelatedServicesSidebar } from "@/components/RelatedServicesSidebar";
import { splitServicesForContentSidebar } from "@/lib/related-services-for-content";
import { packageOfferCatalogJsonLd } from "@/lib/blog-seo/package-offer-jsonld";
import { stripUndefinedJsonLd } from "@/lib/blog-seo/json-ld";
import { findBlogRedirectDestination } from "@/lib/blog-redirects";
import { getSeoBlogRedirect } from "@/lib/gsc-indexing-agent/seo-blog-redirects";
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
  const modifiedTime = fs
    ? pickBlogDisplayUpdatedYmd(fs)
    : p.updatedAt || p.date;

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
  const [fs, moreLikeThis, catalog, clusterCatalog] = await Promise.all([
    getPublishedBlogPostBySlug(slug),
    getMoreLikeThisForBlog(slug, 6),
    buildBlogCatalogContext(),
    buildClusterCatalog(),
  ]);

  const pageUrl = `${SITE_URL.replace(/\/$/, "")}/blog/${p.slug}`;
  const contentMeta = { title: p.title, keywords: p.keywords };
  const faqs = getTopicAwareBlogFaqs({
    title: p.title,
    excerpt: p.excerpt,
    keywords: p.keywords,
    faqs: p.faqs,
  });
  const enrichedContent = enrichMarkdownWithClusterLinks(
    p.content,
    { ...contentMeta, slug: p.slug, kind: "blog" },
    clusterCatalog,
  );
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
  const dateModified = fs
    ? pickBlogDisplayUpdatedYmd(fs)
    : p.updatedAt ?? p.date;
  const publishedLabel = (fs?.publishedAt || p.date || "").slice(0, 10);
  const focusServiceSlug = fs?.serviceSlug?.trim() || undefined;
  const topicCta = getTopicCta(contentMeta, focusServiceSlug);
  const { related: relatedServices, other: otherServices } =
    splitServicesForContentSidebar(
      catalog.services,
      p,
      focusServiceSlug,
      3,
      5,
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
      <div className="site-container site-sidebar-grid">
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
            layout="bounded"
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
              <Link href={topicCta.primaryHref} className={blogBookNowClass}>
                {topicCta.primaryLabel}
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
            <BlogContent content={enrichedContent} />
          </div>

          <BlogLivePricing
            focusServiceSlug={focusServiceSlug}
            topicMeta={contentMeta}
          />

          <BlogWhyChooseSection
            content={{ title: p.title, keywords: p.keywords }}
          />

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

          {moreLikeThis.length > 0 ? (
            <MoreLikeThisSection
              items={moreLikeThis}
              currentTitle={p.title}
              currentKeywords={p.keywords}
            />
          ) : null}

          <TopicCtaSection
            content={contentMeta}
            focusServiceSlug={focusServiceSlug}
          />

          {/* Mobile: related services below article */}
          <div className="mt-5 border-t border-ocean-100 pt-4 lg:hidden">
            <RelatedServicesSidebar
              services={relatedServices}
              otherServices={otherServices}
              showScarcity={false}
              compact
            />
          </div>
        </div>

        <aside className="hidden min-w-0 lg:sticky lg:top-16 lg:block lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-4">
          <RelatedServicesSidebar
            services={relatedServices}
            otherServices={otherServices}
            showScarcity={false}
            compact
          />
        </aside>
      </div>
    </article>
  );
}
