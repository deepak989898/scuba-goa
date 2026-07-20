import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts } from "@/data/blog-posts";
import { BlogContent } from "@/components/BlogContent";
import { BlogLivePricing } from "@/components/BlogLivePricing";
import { BlogWhyChooseSection } from "@/components/BlogWhyChooseSection";
import { BlogTableOfContents } from "@/components/BlogTableOfContents";
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
import { extractBlogToc } from "@/lib/blog-seo/headings";
import { stripUndefinedJsonLd } from "@/lib/blog-seo/json-ld";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;
export const revalidate = 3600;

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=75`;

const DETAIL_FALLBACKS = [
  u("photo-1544551763-46a013bb70d5"),
  u("photo-1682687220063-4742bd7fd538"),
  u("photo-1559827260-dc66d52bef19"),
  u("photo-1582967788606-a171f1080dd0"),
  u("photo-1530549387789-4c1017266635"),
  u("photo-1507525428034-b723cf961d3e"),
];

function blogDetailFallbackImage(slug: string, keywords: string[]): string {
  const hay = `${slug} ${keywords.join(" ")}`.toLowerCase();
  if (hay.includes("family") || hay.includes("beginner") || hay.includes("safe")) {
    return DETAIL_FALLBACKS[1]!;
  }
  if (hay.includes("andaman") || hay.includes("island") || hay.includes("boat")) {
    return DETAIL_FALLBACKS[2]!;
  }
  if (hay.includes("price") || hay.includes("cost") || hay.includes("budget")) {
    return DETAIL_FALLBACKS[3]!;
  }
  if (hay.includes("water") || hay.includes("sport") || hay.includes("jet")) {
    return DETAIL_FALLBACKS[4]!;
  }
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i) * (i + 1)) % 997;
  return DETAIL_FALLBACKS[h % DETAIL_FALLBACKS.length]!;
}

export async function generateStaticParams() {
  const staticSlugs = blogPosts.map((p) => p.slug);
  const fsSlugs = await listPublishedBlogSlugsServer();
  const seen = new Set(staticSlugs);
  const merged = [...staticSlugs];
  for (const s of fsSlugs) {
    if (!seen.has(s)) merged.push(s);
  }
  return merged.map((slug) => ({ slug }));
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
  const description =
    fs?.metaDescription?.trim() ||
    p.excerpt;
  const ogImage =
    fs?.ogImageUrl?.trim() ||
    fs?.featuredImageUrl?.trim() ||
    p.imageUrl?.trim() ||
    blogDetailFallbackImage(p.slug, p.keywords);
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
  const p = await getBlogPostBySlugMerged(slug);
  if (!p) notFound();
  const [fs, related, catalog] = await Promise.all([
    getPublishedBlogPostBySlug(slug),
    getRelatedBlogPostsMerged(slug, 6),
    buildBlogCatalogContext(),
  ]);

  const pageUrl = `${SITE_URL.replace(/\/$/, "")}/blog/${p.slug}`;
  const faqs = p.faqs ?? [];
  const featuredImage =
    fs?.featuredImageUrl?.trim() ||
    fs?.ogImageUrl?.trim() ||
    p.imageUrl?.trim() ||
    blogDetailFallbackImage(p.slug, p.keywords);
  const featuredImageAlt =
    fs?.featuredImageAlt?.trim() || p.imageAlt?.trim() || p.title;
  const dateModified = fs?.updatedAt?.slice(0, 10) ?? p.updatedAt ?? p.date;
  const publishedLabel = (fs?.publishedAt || p.date || "").slice(0, 10);
  const focusServiceSlug = fs?.serviceSlug?.trim() || undefined;
  const relatedServices = relatedServicesForContent(
    catalog.services,
    p,
    focusServiceSlug,
    4,
  );
  const toc = extractBlogToc(p.content);

  return (
    <article className="bg-white py-5 sm:py-7">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            blogPostingJsonLd({
              title: p.title,
              excerpt: p.excerpt,
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
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-6 lg:px-8">
        <div className="min-w-0">
          <nav className="text-sm text-ocean-700" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ocean-800">
              Home
            </Link>
            <span className="mx-2 text-ocean-400">/</span>
            <Link href="/blog" className="hover:text-ocean-800">
              Blog
            </Link>
            <span className="mx-2 text-ocean-400">/</span>
            <span className="text-ocean-500">{p.title}</span>
          </nav>
          <Link
            href="/blog"
            className="mt-2 inline-block text-sm font-semibold text-ocean-700 hover:text-ocean-800"
          >
            ← All articles
          </Link>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <h1 className="min-w-0 flex-1 font-display text-2xl font-extrabold leading-snug text-ocean-900 sm:text-3xl">
              {p.title}
            </h1>
            <p className="shrink-0 pt-1 text-sm text-ocean-500 sm:pt-1.5 sm:text-right">
              {p.date} · {p.readTime}
            </p>
          </div>

          <BlogTrustBlock
            publishedAt={publishedLabel || undefined}
            updatedAt={dateModified}
          />

          {featuredImage ? (
            <div className="relative mt-3 aspect-[16/9] w-full overflow-hidden rounded-xl border border-ocean-100 bg-ocean-900">
              <CmsRemoteImage
                src={featuredImage}
                alt={featuredImageAlt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 900px"
                priority
                quality={72}
              />
            </div>
          ) : null}

          <p className="mt-3 border-l-4 border-amber-400 bg-amber-50/60 py-2 pl-3 text-base leading-relaxed text-ocean-800">
            {p.excerpt}
          </p>

          <BlogTableOfContents items={toc} />

          <div className="prose prose-ocean mt-5 max-w-none text-ocean-800 prose-headings:font-display prose-a:text-ocean-700">
            <BlogContent content={p.content} />
          </div>

          <BlogLivePricing focusServiceSlug={focusServiceSlug} />

          <BlogWhyChooseSection />

          {faqs.length > 0 && (
            <section
              className="mt-8 border-t border-ocean-100 pt-8"
              aria-labelledby="faq-heading"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
                Helpful answers
              </p>
              <h2
                id="faq-heading"
                className="mt-1 font-display text-xl font-bold text-ocean-900 sm:text-2xl"
              >
                Frequently asked questions
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ocean-700">
                Open any question for a quick answer before planning or booking.
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
          )}

          {related.length > 0 && (
            <section
              className="mt-8 border-t border-ocean-100 pt-8"
              aria-labelledby="related-articles-heading"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-amber-700">
                Continue exploring
              </p>
              <h2
                id="related-articles-heading"
                className="mt-1 font-display text-xl font-bold text-ocean-900 sm:text-2xl"
              >
                Related articles
              </h2>
              <p className="mt-1.5 text-sm text-ocean-700">
                Keep reading this topic cluster before booking.
              </p>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {related.map((r) => {
                  const cardImage =
                    r.imageUrl ||
                    blogDetailFallbackImage(r.slug, r.keywords);
                  return (
                    <li key={r.slug} className="h-full">
                      <Link
                        href={`/blog/${r.slug}`}
                        className="group flex h-full flex-col overflow-hidden rounded-xl border border-ocean-100 bg-sand shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
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
                        <div className="flex flex-1 flex-col p-3.5">
                          <p className="text-[11px] font-medium text-cyan-700">
                            {r.date} · {r.readTime}
                          </p>
                          <h3 className="mt-1 font-display text-base font-bold leading-snug text-ocean-900 transition group-hover:text-cyan-700 sm:text-lg">
                            {r.title}
                          </h3>
                          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ocean-700">
                            {r.excerpt}
                          </p>
                          <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-amber-700">
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
            className="mt-8 rounded-xl border border-ocean-100 bg-ocean-50/50 p-5 sm:p-6"
            aria-labelledby="related-links-heading"
          >
            <h2
              id="related-links-heading"
              className="font-display text-lg font-bold text-ocean-900 sm:text-xl"
            >
              Book & explore more
            </h2>
            <p className="mt-1.5 text-sm text-ocean-700">
              Continue planning on our main pages — live packages and clear reporting
              times.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2.5 text-sm font-semibold">
              <li>
                <Link
                  href="/booking"
                  className="inline-flex rounded-full bg-ocean-gradient px-5 py-2.5 text-white hover:opacity-95"
                >
                  Book now — live rates
                </Link>
              </li>
              <li>
                <Link
                  href="/services/scuba-diving"
                  className="inline-flex rounded-full border border-ocean-300 bg-white px-5 py-2.5 text-ocean-800 hover:border-ocean-400"
                >
                  Scuba diving
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="inline-flex rounded-full border border-ocean-200 bg-white px-5 py-2.5 text-ocean-700 hover:border-ocean-400"
                >
                  All services
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

          {/* Mobile: related services below article */}
          <div className="mt-8 border-t border-ocean-100 pt-8 lg:hidden">
            <RelatedServicesSidebar
              services={relatedServices}
              showScarcity={false}
              compact
            />
          </div>
        </div>

        <aside className="hidden min-w-0 lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-8">
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
