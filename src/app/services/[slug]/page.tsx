import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRIMARY_SEO_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/constants";
import { ServiceDetailGallery } from "@/components/ServiceDetailGallery";
import { ServiceDetailSections } from "@/components/ServiceDetailSections";
import { ServiceSubServicesCart } from "@/components/ServiceSubServicesCart";
import { ServiceMediaTabs } from "@/components/ServiceMediaTabs";
import {
  getAllServicesServer,
  getServiceBySlugServer,
} from "@/lib/get-services-server";
import { serviceDetailImages } from "@/lib/service-images";
import { fallbackServices } from "@/data/services";
import { ServiceDetailActions } from "@/components/cart/ServiceDetailActions";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { RelatedServicesSidebar } from "@/components/RelatedServicesSidebar";
import { ServiceFaqs } from "@/components/ServiceFaqs";
import {
  buildShareOpenGraph,
  buildShareTwitter,
} from "@/lib/og-metadata";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return fallbackServices.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await getServiceBySlugServer(slug);
  if (!s) return { title: "Service" };
  const baseUrl = SITE_URL.replace(/\/$/, "");
  const canonical = `${baseUrl}/services/${slug}`;
  const fromDetail = s.detailContent?.split(/\n\s*\n+/)[0]?.trim().slice(0, 155);
  const desc =
    (fromDetail && fromDetail.length > 0 ? fromDetail : s.short) +
    ` — book ${s.title.toLowerCase()} in Goa with WhatsApp or Razorpay.`;
  const shareImage = serviceDetailImages(s).find(Boolean) ?? s.image;
  const priceInr = s.priceFrom;
  const ogBase = {
    description: desc.slice(0, 200),
    url: canonical,
    imageUrl: shareImage,
    imageAlt: s.title,
    priceInr,
    priceMode: "from" as const,
  };

  if (slug === "scuba-diving") {
    const scubaDesc =
      "Scuba diving in Goa: try dives & packages with clear scuba diving price Goa, certified instructors, boat trips, and secure Razorpay checkout. Compare inclusions and book the best scuba experience.";
    return {
      title: `Scuba Diving in Goa — Prices, Packages & Beginner Experience`,
      description: scubaDesc.slice(0, 320),
      keywords: [
        ...PRIMARY_SEO_KEYWORDS,
        s.title,
        "try dive Goa",
        "Grande Island",
        "scuba diving packages Goa",
      ],
      alternates: { canonical },
      openGraph: buildShareOpenGraph({
        title: `Scuba diving in Goa — prices & packages`,
        ...ogBase,
        description: scubaDesc.slice(0, 200),
      }),
      twitter: buildShareTwitter({
        title: `Scuba diving in Goa — prices & packages`,
        description: scubaDesc.slice(0, 200),
        imageUrl: shareImage,
        priceInr,
        priceMode: "from",
      }),
    };
  }

  return {
    title: s.title,
    description: desc.slice(0, 320),
    keywords: [s.title, "Goa", "booking"],
    alternates: { canonical },
    openGraph: buildShareOpenGraph({
      title: s.title,
      ...ogBase,
    }),
    twitter: buildShareTwitter({
      title: s.title,
      description: desc.slice(0, 200),
      imageUrl: shareImage,
      priceInr,
      priceMode: "from",
    }),
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const allServices = await getAllServicesServer();
  const s = allServices.find((service) => service.slug === slug);
  if (!s) notFound();

  const heroImages = serviceDetailImages(s);
  const relatedServices = allServices
    .filter((service) => service.slug !== s.slug)
    .slice(0, 4);

  return (
    <article className="bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8 lg:px-8">
        <div className="min-w-0">
          <ServiceDetailGallery images={heroImages} title={s.title} />

          <div className="pt-8 sm:pt-10">
            <h1 className="font-display text-2xl font-bold text-ocean-900 sm:text-4xl">
              {s.title}
            </h1>
          </div>

          <div className="pt-4 sm:pt-6">
            <ServiceDetailSections service={s} />
            <ServiceSubServicesCart service={s} />
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
                Share this service
              </p>
              <div className="mt-2">
                <SocialShareButtons
                  title={s.title}
                  path={`/services/${s.slug}`}
                  priceInr={s.priceFrom}
                  priceMode="from"
                />
              </div>
            </div>
            <div className="mt-10">
              <ServiceDetailActions service={s} />
            </div>
            <ServiceMediaTabs service={s} />
            <ServiceFaqs service={s} />
          </div>
        </div>

        <RelatedServicesSidebar services={relatedServices} />
      </div>
    </article>
  );
}
