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
      ...(ogImage ? { images: [{ url: ogImage, alt: p.title }] } : {}),
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
  const fs = await getPublishedBlogPostBySlug(slug);

  const pageUrl = `${SITE_URL.replace(/\/$/, "")}/blog/${p.slug}`;
  const faqs = p.faqs ?? [];
  const related = await getRelatedBlogPostsMerged(p.slug, 3);
  const featuredImage = fs?.featuredImageUrl?.trim();
  const dateModified = fs?.updatedAt?.slice(0, 10) ?? p.date;
  const catalog = await buildBlogCatalogContext();
  const offerList = offerCatalogJsonLd(catalog.packages, pageUrl);
  const focusServiceSlug = fs?.serviceSlug?.trim() || undefined;

  return (
    <article className="bg-white py-16 sm:py-20">
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
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
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
          className="mt-4 inline-block text-sm font-semibold text-ocean-700 hover:text-ocean-800"
        >
          ← All articles
        </Link>
        <p className="mt-6 text-sm text-ocean-500">
          {p.date} · {p.readTime}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ocean-900 sm:text-4xl">
          {p.title}
        </h1>
        <p className="mt-4 text-lg text-ocean-700">{p.excerpt}</p>
        {featuredImage ? (
          <div className="relative mt-8 w-full overflow-hidden rounded-2xl border border-ocean-100 bg-ocean-900">
            <Image
              src={featuredImage}
              alt={p.title}
              width={1200}
              height={675}
              className="h-auto w-full"
              style={{ width: "100%", height: "auto" }}
              sizes="(max-width: 768px) 100vw, 672px"
              priority
            />
          </div>
        ) : null}
        <div className="prose prose-ocean mt-10 max-w-none text-ocean-800 prose-headings:font-display prose-a:text-ocean-700">
          <BlogContent content={p.content} />
        </div>

        <BlogLivePricing focusServiceSlug={focusServiceSlug} />

        <BlogWhyChooseSection />

        {faqs.length > 0 && (
          <section
            className="mt-14 border-t border-ocean-100 pt-12"
            aria-labelledby="faq-heading"
          >
            <h2
              id="faq-heading"
              className="font-display text-2xl font-bold text-ocean-900"
            >
              Frequently asked questions
            </h2>
            <dl className="mt-6 space-y-6">
              {faqs.map((f) => (
                <div
                  key={f.question}
                  className="rounded-xl border border-ocean-100 bg-sand/40 p-4 sm:p-5"
                >
                  <dt className="font-semibold text-ocean-900">{f.question}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-ocean-700 sm:text-base">
                    {f.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-14 border-t border-ocean-100 pt-12" aria-labelledby="related-articles-heading">
            <h2 id="related-articles-heading" className="font-display text-2xl font-bold text-ocean-900">
              Related articles
            </h2>
            <p className="mt-2 text-sm text-ocean-700 sm:text-base">
              Keep reading this topic cluster before booking.
            </p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/blog/${r.slug}`}
                    className="block rounded-xl border border-ocean-100 bg-sand/40 p-4 transition hover:border-ocean-300"
                  >
                    <p className="text-[11px] text-ocean-500">
                      {r.date} · {r.readTime}
                    </p>
                    <p className="mt-1.5 font-semibold leading-snug text-ocean-900">
                      {r.title}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section
          className="mt-14 rounded-2xl border border-ocean-100 bg-ocean-50/50 p-6 sm:p-8"
          aria-labelledby="related-links-heading"
        >
          <h2
            id="related-links-heading"
            className="font-display text-xl font-bold text-ocean-900"
          >
            Book & explore more
          </h2>
          <p className="mt-2 text-sm text-ocean-700 sm:text-base">
            Continue planning on our main pages—everything links to live packages and clear
            reporting times.
          </p>
          <ul className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
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
    </article>
  );
}
