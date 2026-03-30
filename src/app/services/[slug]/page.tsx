import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailGallery } from "@/components/ServiceDetailGallery";
import { ServiceDetailSections } from "@/components/ServiceDetailSections";
import { ServiceSubServicesCart } from "@/components/ServiceSubServicesCart";
import { ServiceMediaTabs } from "@/components/ServiceMediaTabs";
import { getServiceBySlugServer } from "@/lib/get-services-server";
import { serviceDetailImages } from "@/lib/service-images";
import { fallbackServices } from "@/data/services";
import { ServiceDetailActions } from "@/components/cart/ServiceDetailActions";
import { SocialShareButtons } from "@/components/SocialShareButtons";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return fallbackServices.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await getServiceBySlugServer(slug);
  if (!s) return { title: "Service" };
  const fromDetail = s.detailContent?.split(/\n\s*\n+/)[0]?.trim().slice(0, 155);
  const desc =
    (fromDetail && fromDetail.length > 0 ? fromDetail : s.short) +
    ` — book ${s.title.toLowerCase()} in Goa with WhatsApp or Razorpay.`;
  return {
    title: s.title,
    description: desc.slice(0, 320),
    keywords: [s.title, "Goa", "booking"],
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
            <SocialShareButtons title={s.title} path={`/services/${s.slug}`} />
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
