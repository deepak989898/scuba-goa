import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetailGallery } from "@/components/ServiceDetailGallery";
import { ServiceDetailSections } from "@/components/ServiceDetailSections";
import { ServiceSubServicesCart } from "@/components/ServiceSubServicesCart";
import { getServiceBySlugServer } from "@/lib/get-services-server";
import { serviceDetailImages } from "@/lib/service-images";
import { fallbackServices } from "@/data/services";
import { ServiceDetailActions } from "@/components/cart/ServiceDetailActions";

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
      <ServiceDetailGallery images={heroImages} title={s.title} short={s.short} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <ServiceDetailSections service={s} />
        <ServiceSubServicesCart service={s} />
        <div className="mt-10">
          <ServiceDetailActions service={s} />
        </div>
      </div>
    </article>
  );
}
