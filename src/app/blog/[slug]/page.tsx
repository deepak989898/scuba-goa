import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts, getPostBySlug } from "@/data/blog-posts";
import { BlogContent } from "@/components/BlogContent";
import { BlogWhyChooseSection } from "@/components/BlogWhyChooseSection";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getPostBySlug(slug);
  if (!p) return { title: "Article" };
  const canonical = `${SITE_URL.replace(/\/$/, "")}/blog/${p.slug}`;
  const title = p.metaTitle ?? `${p.title} | ${SITE_NAME}`;
  return {
    title,
    description: p.excerpt,
    keywords: p.keywords,
    alternates: { canonical },
    openGraph: {
      title: p.title,
      description: p.excerpt,
      type: "article",
      url: canonical,
      siteName: SITE_NAME,
      publishedTime: p.date,
      modifiedTime: p.date,
    },
    twitter: {
      card: "summary_large_image",
      title: p.title,
      description: p.excerpt,
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

function articleJsonLd(p: {
  title: string;
  excerpt: string;
  date: string;
  slug: string;
  keywords?: string[];
}) {
  const url = `${SITE_URL.replace(/\/$/, "")}/blog/${p.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.excerpt,
    datePublished: p.date,
    dateModified: p.date,
    keywords: p.keywords?.length ? p.keywords.join(", ") : undefined,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const p = getPostBySlug(slug);
  if (!p) notFound();

  const pageUrl = `${SITE_URL.replace(/\/$/, "")}/blog/${p.slug}`;
  const faqs = p.faqs ?? [];

  return (
    <article className="bg-white py-16 sm:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd(p)),
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
        <nav className="text-sm text-ocean-600" aria-label="Breadcrumb">
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
          className="mt-4 inline-block text-sm font-semibold text-ocean-600 hover:text-ocean-800"
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
        <div className="prose prose-ocean mt-10 max-w-none text-ocean-800 prose-headings:font-display prose-a:text-ocean-600">
          <BlogContent content={p.content} />
        </div>

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
