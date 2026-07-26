import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRIMARY_SEO_KEYWORDS, SITE_URL } from "@/lib/constants";
import { ServiceDetailGallery } from "@/components/ServiceDetailGallery";
import { ServiceDetailSections } from "@/components/ServiceDetailSections";
import { ServiceSubServicesCart } from "@/components/ServiceSubServicesCart";
import { ServiceMediaTabs } from "@/components/ServiceMediaTabs";
import { ServiceSubLandingView } from "@/components/ServiceSubLandingView";
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
  findSubByPublicSlug,
  listSubServicePaths,
} from "@/lib/service-sub-helpers";
import { buildSubServiceMetadata } from "@/lib/service-sub-metadata";
import {
  buildShareOpenGraph,
  buildShareTwitter,
} from "@/lib/og-metadata";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  const parents = fallbackServices.map((s) => ({ slug: s.slug }));
  const subs = listSubServicePaths(fallbackServices).map((e) => ({
    slug: e.subSlug,
  }));
  return [...parents, ...subs];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const all = await getAllServicesServer();
  const parent = all.find((s) => s.slug === slug) ?? (await getServiceBySlugServer(slug));
  if (parent) {
    const baseUrl = SITE_URL.replace(/\/$/, "");
    const canonical = `${baseUrl}/services/${slug}`;
    const fromDetail = parent.detailContent?.split(/\n\s*\n+/)[0]?.trim().slice(0, 155);
    const desc =
      (fromDetail && fromDetail.length > 0 ? fromDetail : parent.short) +
      ` — book ${parent.title.toLowerCase()} in Goa with WhatsApp or Razorpay.`;
    const shareImage = serviceDetailImages(parent).find(Boolean) ?? parent.image;
    const priceInr = parent.priceFrom;
    const ogBase = {
      description: desc.slice(0, 200),
      url: canonical,
      imageUrl: shareImage,
      imageAlt: parent.title,
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
          parent.title,
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
      title: parent.title,
      description: desc.slice(0, 320),
      keywords: [parent.title, "Goa", "booking"],
      alternates: { canonical },
      openGraph: buildShareOpenGraph({
        title: parent.title,
        ...ogBase,
      }),
      twitter: buildShareTwitter({
        title: parent.title,
        description: desc.slice(0, 200),
        imageUrl: shareImage,
        priceInr,
        priceMode: "from",
      }),
    };
  }

  const subHit = findSubByPublicSlug(all, slug);
  if (subHit) {
    return buildSubServiceMetadata(
      subHit.service,
      subHit.sub,
      subHit.publicSlug,
    );
  }

  return { title: "Service" };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const allServices = await getAllServicesServer();
  const s = allServices.find((service) => service.slug === slug);
  if (s) {
    const heroImages = serviceDetailImages(s);
    const relatedServices = allServices
      .filter((service) => service.slug !== s.slug)
      .slice(0, 4);

    return (
      <article className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-4 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-5 lg:px-8">
          <div className="min-w-0">
            <ServiceDetailGallery images={heroImages} title={s.title} />

            <div className="pt-3 sm:pt-4">
              <h1 className="font-display text-2xl font-bold leading-tight text-ocean-900 sm:text-3xl">
                {s.title}
              </h1>
            </div>

            <div className="pt-2.5 sm:pt-3">
              <ServiceDetailSections service={s} />
              <ServiceSubServicesCart service={s} />
              <div className="mt-4 lg:hidden">
                <ServiceDetailActions service={s} layout="sidebar" />
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
                  Share this service
                </p>
                <div className="mt-1.5">
                  <SocialShareButtons
                    title={s.title}
                    path={`/services/${s.slug}`}
                    priceInr={s.priceFrom}
                    priceMode="from"
                  />
                </div>
              </div>
              <ServiceMediaTabs service={s} />
              <ServiceFaqs service={s} />
            </div>
          </div>

          <aside className="hidden min-w-0 lg:block">
            <div className="lg:sticky lg:top-16 lg:space-y-4">
              <ServiceDetailActions service={s} layout="sidebar" />
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

  const subHit = findSubByPublicSlug(allServices, slug);
  if (!subHit) notFound();

  return (
    <ServiceSubLandingView
      parent={subHit.service}
      sub={subHit.sub}
      index={subHit.index}
      publicSlug={subHit.publicSlug}
      allServices={allServices}
    />
  );
}
