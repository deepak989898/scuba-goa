import Link from "next/link";
import type { ServiceItem, SubServiceItem } from "@/data/services";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { ServiceDetailGallery } from "@/components/ServiceDetailGallery";
import { ServiceMediaTabs } from "@/components/ServiceMediaTabs";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { RelatedServicesSidebar } from "@/components/RelatedServicesSidebar";
import { ServiceSubDetailActions } from "@/components/cart/ServiceSubDetailActions";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ServiceDetailProse } from "@/components/ServiceDetailProse";
import { serviceDetailImages } from "@/lib/service-images";
import { getSubServiceFaqs } from "@/lib/service-faqs";
import { encodeServiceSubOption } from "@/lib/booking-selection";
import { buildHeroBookingHref } from "@/lib/hero-slide-booking";
import {
  assignSubServicePublicSlugs,
  getSubServiceCartKey,
  isPricedSubService,
} from "@/lib/service-sub-helpers";

const sibPriceBadgeClass =
  "inline-flex min-h-10 w-full cursor-default items-center justify-center rounded-full border-2 border-amber-500/80 bg-gradient-to-r from-yellow-200 via-amber-100 to-orange-100 px-3 py-2 text-center font-display text-sm font-extrabold tabular-nums text-amber-950 shadow-sm";

const sibViewDetailsClass =
  "inline-flex min-h-10 w-full touch-manipulation items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 px-3 py-2 text-center text-sm font-extrabold text-white shadow-md shadow-cyan-700/30 ring-1 ring-cyan-200/60 transition hover:brightness-110 active:brightness-95";

const sibAddToCartClass =
  "!min-h-10 !w-full !border-0 !bg-gradient-to-r !from-teal-500 !via-cyan-600 !to-ocean-800 !px-3 !py-2 !text-sm !font-extrabold !text-white !shadow-md !shadow-cyan-700/35 ring-1 ring-cyan-300/50 hover:!brightness-110";

const sibBookNowClass =
  "inline-flex min-h-10 w-full touch-manipulation items-center justify-center rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-3 py-2 text-center text-sm font-extrabold text-white shadow-md shadow-orange-500/35 ring-1 ring-amber-200/70 transition hover:brightness-110 active:brightness-95";

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
  const productImages = (
    heroImages.length > 0
      ? heroImages.slice(0, 4)
      : [`${baseUrl}/booking-header.png`]
  ).map((src) =>
    src.startsWith("http")
      ? src
      : `${baseUrl}${src.startsWith("/") ? src : `/${src}`}`,
  );
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: sub.title,
    description:
      sub.description?.trim() ||
      `${sub.title} under ${parent.title} with ${SITE_NAME}`,
    image: productImages,
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

      <div className="site-container site-sidebar-grid py-4 sm:py-5">
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
              <ServiceDetailProse
                text={sub.description}
                className="space-y-2.5"
              />
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
                <h2 className="font-display text-lg font-extrabold tracking-wide text-emerald-600">
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
                <h2 className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text font-display text-lg font-extrabold tracking-wide text-transparent sm:text-xl">
                  Other {parent.title} options
                </h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {siblings.map((sib) => {
                    const sibPriced = isPricedSubService(sib.sub);
                    const sibPrice = sibPriced
                      ? sib.sub.priceFrom!
                      : parent.priceFrom;
                    const sibCartKey = getSubServiceCartKey(sib.sub, sib.index);
                    const sibTitle = `${parent.title} — ${sib.sub.title}`;
                    const bookHref = buildHeroBookingHref(
                      encodeServiceSubOption(parent.slug, sibCartKey),
                    );
                    return (
                      <li
                        key={sib.path}
                        className="relative overflow-hidden rounded-2xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-100 p-3 shadow-lg shadow-amber-400/25 ring-2 ring-amber-200/70 sm:p-3.5"
                      >
                        <div
                          aria-hidden
                          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-yellow-300/60 to-orange-300/35 blur-2xl"
                        />
                        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={sib.path}
                              className="font-display text-base font-bold text-amber-950 hover:text-orange-800 hover:underline sm:text-lg"
                            >
                              {sib.sub.title}
                            </Link>
                            {sib.sub.description ? (
                              <p className="mt-1 line-clamp-3 text-sm leading-snug text-amber-950/80">
                                {sib.sub.description}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-36 sm:self-center">
                            <div
                              className={sibPriceBadgeClass}
                              aria-label={`Price ₹${sibPrice.toLocaleString("en-IN")}`}
                            >
                              ₹{sibPrice.toLocaleString("en-IN")}
                            </div>
                            <Link href={sib.path} className={sibViewDetailsClass}>
                              View details
                            </Link>
                            <AddToCartButton
                              variant="service"
                              slug={parent.slug}
                              title={sibTitle}
                              priceFrom={sibPrice}
                              subKey={sibCartKey}
                              image={parent.image}
                              duration={parent.duration}
                              includes={sib.sub.includes ?? parent.includes}
                              rating={parent.rating}
                              slotsLeft={sib.sub.slotsLeft ?? parent.slotsLeft}
                              bookedToday={
                                sib.sub.bookedToday ?? parent.bookedToday
                              }
                              size="sm"
                              className={sibAddToCartClass}
                            />
                            <Link href={bookHref} className={sibBookNowClass}>
                              Book now
                            </Link>
                          </div>
                        </div>
                      </li>
                    );
                  })}
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
