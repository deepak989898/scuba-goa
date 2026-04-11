import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogContent } from "@/components/BlogContent";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { buildHeroBookingHref } from "@/lib/hero-slide-booking";
import { getPublishedSeoPageBySlug } from "@/lib/seo-pages-server";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

function absAssetUrl(url: string): string {
  const t = url.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  const base = SITE_URL.replace(/\/$/, "");
  return `${base}${t.startsWith("/") ? t : `/${t}`}`;
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

export default async function SeoGuidePage({ params }: Props) {
  const { slug } = await params;
  const page = await getPublishedSeoPageBySlug(slug);
  if (!page) notFound();

  const bookHref = buildHeroBookingHref(
    page.bookingOption.trim() ? page.bookingOption : undefined,
  );
  const heroSrc = page.heroImageUrl.trim() || page.ogImageUrl.trim();

  return (
    <article className="bg-white py-12 sm:py-16">
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
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <nav className="text-sm text-ocean-600" aria-label="Breadcrumb">
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

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <Link
            href="/guides"
            className="inline-block text-sm font-semibold text-ocean-600 hover:text-ocean-800"
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

        {heroSrc ? (
          <div className="relative mt-8 aspect-[2/1] w-full max-h-[min(420px,42vh)] overflow-hidden rounded-2xl border border-ocean-100 bg-ocean-50 shadow-sm sm:aspect-[21/9]">
            <Image
              src={heroSrc}
              alt={page.headline}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          </div>
        ) : null}

        <h1 className="mt-8 font-display text-3xl font-bold leading-tight text-ocean-900 sm:text-4xl">
          {page.headline}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ocean-700">
          {page.metaDescription}
        </p>

        {page.bodyContent.trim() ? (
          <div className="prose prose-ocean mt-10 max-w-none text-ocean-800 prose-headings:font-display prose-a:text-ocean-600">
            <BlogContent content={page.bodyContent} />
          </div>
        ) : null}

        <section
          className="mt-14 rounded-2xl border border-ocean-200 bg-gradient-to-br from-cyan-50/80 to-ocean-50 p-6 shadow-sm sm:p-8"
          aria-labelledby="guide-book-heading"
        >
          <h2
            id="guide-book-heading"
            className="font-display text-xl font-bold text-ocean-900 sm:text-2xl"
          >
            Book this experience
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ocean-700 sm:text-base">
            Secure checkout with Razorpay, instant WhatsApp confirmation, and same-day slots
            when available — continue on the booking page.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={bookHref}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-ocean-gradient px-6 py-2.5 text-sm font-extrabold text-white shadow-md hover:opacity-95"
            >
              Book now
            </Link>
            <Link
              href="/services"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-ocean-300 bg-white px-5 py-2.5 text-sm font-semibold text-ocean-800 hover:border-ocean-400"
            >
              All services
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-ocean-200 bg-white px-5 py-2.5 text-sm font-semibold text-ocean-700 hover:border-ocean-400"
            >
              Contact
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
