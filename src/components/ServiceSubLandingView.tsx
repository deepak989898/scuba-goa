import Link from "next/link";
import type { ServiceItem, SubServiceItem } from "@/data/services";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { ServiceDetailGallery } from "@/components/ServiceDetailGallery";
import { ServiceMediaTabs } from "@/components/ServiceMediaTabs";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { RelatedServicesSidebar } from "@/components/RelatedServicesSidebar";
import { ServiceSubDetailActions } from "@/components/cart/ServiceSubDetailActions";
import { serviceDetailImages } from "@/lib/service-images";
import { getSubServiceFaqs } from "@/lib/service-faqs";
import {
  assignSubServicePublicSlugs,
  isPricedSubService,
} from "@/lib/service-sub-helpers";

type Props = {
  parent: ServiceItem;
  sub: SubServiceItem;
  index: number;
  publicSlug: string;
  allServices: ServiceItem[];
};

export function ServiceSubLandingView({
  parent,
  sub,
  index,
  publicSlug,
  allServices,
}: Props) {
  const heroImages = serviceDetailImages(parent);
  const includes = (sub.includes?.length ? sub.includes : parent.includes).filter(
    Boolean,
  );
  const price =
    isPricedSubService(sub) && sub.priceFrom != null
      ? sub.priceFrom
      : parent.priceFrom;
  const faqs = getSubServiceFaqs(parent, sub);
  const pagePath = `/services/${publicSlug}`;

  const siblings = assignSubServicePublicSlugs(allServices).filter(
    (e) => e.service.slug === parent.slug && e.publicSlug !== publicSlug,
  );

  const relatedServices = allServices
    .filter((s) => s.slug !== parent.slug && s.active !== false)
    .slice(0, 4);

  const parentExcerpt =
    parent.detailContent
      ?.split(/\n\s*\n+/)
      .map((p) => p.trim())
      .find(Boolean)
      ?.slice(0, 420) ?? parent.short;

  const baseUrl = SITE_URL.replace(/\/$/, "");
  const pageUrl = `${baseUrl}${pagePath}`;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${baseUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Services",
        item: `${baseUrl}/services`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: parent.title,
        item: `${baseUrl}/services/${parent.slug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: sub.title,
        item: pageUrl,
      },
    ],
  };
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: sub.title,
    description:
      sub.description?.trim() ||
      `${sub.title} under ${parent.title} with ${SITE_NAME}`,
    image: heroImages.slice(0, 4),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: price,
      availability: "https://schema.org/InStock",
      url: pageUrl,
    },
  };
  const faqLd = {
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
  };

  return (
    <article className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-4 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-5 lg:px-8">
        <div className="min-w-0">
          <nav
            aria-label="Breadcrumb"
            className="mb-3 text-xs text-ocean-600 sm:text-sm"
          >
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-ocean-900 hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden className="text-ocean-300">
                /
              </li>
              <li>
                <Link
                  href="/services"
                  className="hover:text-ocean-900 hover:underline"
                >
                  Services
                </Link>
              </li>
              <li aria-hidden className="text-ocean-300">
                /
              </li>
              <li>
                <Link
                  href={`/services/${parent.slug}`}
                  className="hover:text-ocean-900 hover:underline"
                >
                  {parent.title}
                </Link>
              </li>
              <li aria-hidden className="text-ocean-300">
                /
              </li>
              <li className="font-semibold text-ocean-900">{sub.title}</li>
            </ol>
          </nav>

          <ServiceDetailGallery images={heroImages} title={sub.title} />

          <div className="pt-3 sm:pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
              Part of {parent.title}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-ocean-900 sm:text-3xl">
              {sub.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <p className="font-display text-xl font-extrabold tabular-nums text-ocean-950">
                ₹{price.toLocaleString("en-IN")}
                <span className="ml-1 text-sm font-semibold text-ocean-600">
                  from
                </span>
              </p>
              <p className="text-sm text-ocean-600">{parent.duration}</p>
              {sub.slotsLeft != null ? (
                <p className="text-sm font-semibold text-red-600">
                  Only {sub.slotsLeft} slots left
                </p>
              ) : null}
              {sub.bookedToday != null ? (
                <p className="text-sm text-ocean-700">
                  Booked {sub.bookedToday} times today
                </p>
              ) : null}
            </div>
          </div>

          <div className="pt-3 sm:pt-4">
            {sub.description?.trim() ? (
              <div className="prose prose-ocean max-w-none text-sm leading-relaxed text-ocean-800 sm:text-base">
                <p className="whitespace-pre-line">{sub.description.trim()}</p>
              </div>
            ) : null}

            {parentExcerpt ? (
              <div className="mt-4 rounded-xl border border-ocean-100 bg-ocean-50/40 p-3 sm:p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
                  About {parent.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ocean-800">
                  {parentExcerpt}
                  {parentExcerpt.length >= 420 ? "…" : ""}
                </p>
                <Link
                  href={`/services/${parent.slug}`}
                  className="mt-2 inline-block text-sm font-semibold text-ocean-800 underline decoration-ocean-300 underline-offset-2 hover:text-ocean-950"
                >
                  View full {parent.title} page
                </Link>
              </div>
            ) : null}

            {includes.length > 0 ? (
              <section className="mt-5">
                <h2 className="font-display text-lg font-bold text-ocean-900">
                  What&apos;s included
                </h2>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {includes.map((inc) => (
                    <li
                      key={inc}
                      className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-medium text-ocean-900 ring-1 ring-ocean-100 sm:text-sm"
                    >
                      {inc}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="mt-4 lg:hidden">
              <ServiceSubDetailActions
                service={parent}
                sub={sub}
                index={index}
                layout="inline"
              />
            </div>

            {siblings.length > 0 ? (
              <section className="mt-6 border-t border-ocean-100 pt-5">
                <h2 className="font-display text-lg font-bold text-ocean-900">
                  Other {parent.title} options
                </h2>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {siblings.map((sib) => (
                    <li key={sib.path}>
                      <Link
                        href={sib.path}
                        className="block rounded-xl border border-ocean-100 bg-sand/30 px-3 py-2.5 transition hover:border-ocean-300 hover:bg-white"
                      >
                        <span className="font-semibold text-ocean-900">
                          {sib.sub.title}
                        </span>
                        {isPricedSubService(sib.sub) &&
                        sib.sub.priceFrom != null ? (
                          <span className="mt-0.5 block text-sm font-bold tabular-nums text-ocean-800">
                            From ₹{sib.sub.priceFrom.toLocaleString("en-IN")}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
                Share this option
              </p>
              <div className="mt-1.5">
                <SocialShareButtons
                  title={sub.title}
                  path={pagePath}
                  priceInr={price}
                  priceMode="from"
                />
              </div>
            </div>

            <ServiceMediaTabs service={parent} />

            <section
              aria-labelledby="sub-service-faq-title"
              className="mt-6 border-t border-ocean-100 pt-5"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
                Helpful information
              </p>
              <h2
                id="sub-service-faq-title"
                className="mt-0.5 font-display text-xl font-bold text-ocean-900 sm:text-2xl"
              >
                FAQs about {sub.title}
              </h2>
              <div className="mt-3 space-y-2">
                {faqs.map((faq, i) => (
                  <details
                    key={`${i}-${faq.question.slice(0, 24)}`}
                    className="group rounded-xl border border-ocean-100 bg-sand/20 px-3 py-2.5 open:bg-white"
                  >
                    <summary className="cursor-pointer list-none font-semibold text-ocean-900 marker:content-none [&::-webkit-details-marker]:hidden">
                      {faq.question}
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-ocean-700">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            <section className="mt-6 border-t border-ocean-100 pt-5">
              <h2 className="font-display text-lg font-bold text-ocean-900">
                Explore more in Goa
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                <li>
                  <Link
                    href={`/services/${parent.slug}`}
                    className="font-semibold text-ocean-800 underline decoration-ocean-300 underline-offset-2"
                  >
                    {parent.title}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services"
                    className="font-semibold text-ocean-800 underline decoration-ocean-300 underline-offset-2"
                  >
                    All services
                  </Link>
                </li>
                <li>
                  <Link
                    href="/booking"
                    className="font-semibold text-ocean-800 underline decoration-ocean-300 underline-offset-2"
                  >
                    Book online
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </div>

        <aside className="hidden min-w-0 lg:block">
          <div className="lg:sticky lg:top-16 lg:space-y-4">
            <ServiceSubDetailActions
              service={parent}
              sub={sub}
              index={index}
              layout="sidebar"
            />
            <RelatedServicesSidebar services={relatedServices} compact />
          </div>
        </aside>

        <div className="lg:hidden">
          <RelatedServicesSidebar services={relatedServices} compact />
        </div>
      </div>
    </article>
  );
}
