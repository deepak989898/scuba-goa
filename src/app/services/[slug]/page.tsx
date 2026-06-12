import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRIMARY_SEO_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/constants";
import { ServiceDetailGallery } from "@/components/ServiceDetailGallery";
import { ServiceDetailSections } from "@/components/ServiceDetailSections";
import { ServiceSubServicesCart } from "@/components/ServiceSubServicesCart";
import { ServiceMediaTabs } from "@/components/ServiceMediaTabs";
import { getServiceBySlugServer } from "@/lib/get-services-server";
import { serviceDetailImages } from "@/lib/service-images";
import { fallbackServices } from "@/data/services";
import { ServiceDetailActions } from "@/components/cart/ServiceDetailActions";
import { SocialShareButtons } from "@/components/SocialShareButtons";
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
      "Scuba diving in Goa: book try dives and packages with clear scuba diving price Goa, trained crews, and secure Razorpay checkout. Best scuba in Goa—compare inclusions before you pay.";
    return {
      title: `Scuba Diving in Goa — Book Try Dive & Packages | ${SITE_NAME}`,
      description: scubaDesc.slice(0, 320),
      keywords: [...PRIMARY_SEO_KEYWORDS, s.title, "try dive Goa", "Grande Island"],
      alternates: { canonical },
      openGraph: buildShareOpenGraph({
        title: `Scuba diving in Goa`,
        ...ogBase,
        description: scubaDesc.slice(0, 200),
      }),
      twitter: buildShareTwitter({
        title: `Scuba diving in Goa`,
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
  const s = await getServiceBySlugServer(slug);
  if (!s) notFound();

  const heroImages = serviceDetailImages(s);

  return (
    <article className="bg-white">
      <ServiceDetailGallery images={heroImages} title={s.title} />
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 sm:pt-10">
        <h1 className="font-display text-2xl font-bold text-ocean-900 sm:text-4xl">
          {s.title}
        </h1>
      </div>
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-4 sm:px-6 sm:pb-12 sm:pt-6 lg:px-8">
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
      </div>
    </article>
  );
}
