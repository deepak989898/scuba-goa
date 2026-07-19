import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts } from "@/data/blog-posts";
import { BlogContent } from "@/components/BlogContent";
import { BlogLivePricing } from "@/components/BlogLivePricing";
import { BlogWhyChooseSection } from "@/components/BlogWhyChooseSection";
import { buildBlogCatalogContext } from "@/lib/blog-automation/catalog-context";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import {
  getBlogPostBySlugMerged,
  getRelatedBlogPostsMerged,
} from "@/lib/blog-posts-unified";
import { getPublishedBlogPostBySlug, listPublishedBlogSlugsServer } from "@/lib/blog-posts-server";
import { RelatedServicesSidebar } from "@/components/RelatedServicesSidebar";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { relatedServicesForContent } from "@/lib/related-services-for-content";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;
export const revalidate = 3600;

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
  const title = p.metaTitle ?? `${p.title} | ${SITE_NAME}`;
  const description = fs?.metaDescription ?? p.excerpt;
  const ogImage = fs?.ogImageUrl?.trim();
  return {
    title: fs?.metaTitle ?? title,
    description,
    keywords: fs?.keywords?.length ? fs.keywords : p.keywords,
    alternates: { canonical },
    openGraph: {
      title: p.title,
      description,
      type: "article",
      url: canonical,
      siteName: SITE_NAME,
      publishedTime: p.date,
      modifiedTime: fs?.updatedAt ?? p.date,
      ...(ogImage ? { images: [{ url: ogImage, alt: fs?.featuredImageAlt?.trim() || p.title }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: p.title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

function faqJsonLd(
  faqs: { question: string; answer: string }[],
  pageUrl: string
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
    p.language === "hi" ? "hi" : p.language === "hinglish" ? "en-IN" : "en";
  return {
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
    ...(p.imageUrl ? { image: [p.imageUrl] } : {}),
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
  };
}

function offerCatalogJsonLd(
  packages: { name: string; price: number; duration: string }[],
  pageUrl: string,
) {
  if (packages.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Book Scuba Goa packages",
    url: pageUrl,
    itemListElement: packages.slice(0, 10).map((pkg, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: pkg.name,
        description: pkg.duration,
        offers: {
          "@type": "Offer",
          price: pkg.price,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL.replace(/\/$/, "")}/booking`,
        },
      },
    })),
  };
}

function breadcrumbJsonLd(p: { title: string; slug: string }) {
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
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const p = await getBlogPostBySlugMerged(slug);
  if (!p) notFound();
  const [fs, related, catalog] = await Promise.all([
    getPublishedBlogPostBySlug(slug),
    getRelatedBlogPostsMerged(slug, 4),
    buildBlogCatalogContext(),
  ]);

  const pageUrl = `${SITE_URL.replace(/\/$/, "")}/blog/${p.slug}`;
  const faqs = p.faqs ?? [];
  const featuredImage = fs?.featuredImageUrl?.trim();
  const dateModified = fs?.updatedAt?.slice(0, 10) ?? p.date;
  const offerList = offerCatalogJsonLd(catalog.packages, pageUrl);
  const focusServiceSlug = fs?.serviceSlug?.trim() || undefined;
  const relatedServices = relatedServicesForContent(
    catalog.services,
    p,
    focusServiceSlug,
  );

  return (
    <article className="bg-white py-5 sm:py-7">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            blogPostingJsonLd({
              title: p.title,
              excerpt: p.excerpt,
              date: p.date,
              dateModified,
              slug: p.slug,
              keywords: p.keywords,
              imageUrl: featuredImage || fs?.ogImageUrl,
              language: fs?.language,
            }),
          ),
        }}
      />
      {offerList ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(offerList) }}
        />
      ) : null}
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
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-7 lg:px-8">
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
        <p className="mt-3 text-sm text-ocean-500">
          {p.date} · {p.readTime}
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold leading-snug text-ocean-900 sm:text-3xl">
          {p.title}
        </h1>
        <p className="mt-3 border-l-4 border-amber-400 bg-amber-50/60 py-2 pl-3 text-base leading-relaxed text-ocean-800">
          {p.excerpt}
        </p>
        {featuredImage ? (
          <div className="relative mt-4 aspect-[16/9] max-h-[min(280px,36vh)] w-full overflow-hidden rounded-xl border border-ocean-100 bg-ocean-900 sm:max-h-[320px]">
            <Image
              src={featuredImage}
              alt={fs?.featuredImageAlt?.trim() || p.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 720px"
              priority
            />
          </div>
        ) : null}
        <div className="prose prose-ocean mt-6 max-w-none text-ocean-800 prose-headings:font-display prose-a:text-ocean-700">
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
              {related.map((r, index) => {
                const fallbackImage =
                  relatedServices[index % relatedServices.length]?.image ||
                  catalog.services[index % catalog.services.length]?.image ||
                  "";
                const cardImage = r.imageUrl || fallbackImage;
                return (
                <li key={r.slug} className="h-full">
                  <Link
                    href={`/blog/${r.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-ocean-100 bg-sand shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    {cardImage ? (
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
                    ) : null}
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
            Continue planning on our main pages—everything links to live packages and clear
            reporting times.
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
                href="/services/dudhsagar-trip"
                className="inline-flex rounded-full border border-ocean-200 bg-white px-5 py-2.5 text-ocean-700 hover:border-ocean-400"
              >
                Dudhsagar trip
              </Link>
            </li>
            <li>
              <Link
                href="/services/north-goa-tour"
                className="inline-flex rounded-full border border-ocean-200 bg-white px-5 py-2.5 text-ocean-700 hover:border-ocean-400"
              >
                North Goa tour
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
