import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { ServiceDetailSections } from "@/components/ServiceDetailSections";
import { getServiceBySlugServer } from "@/lib/get-services-server";
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

  return (
    <article className="bg-white">
      <div className="relative aspect-[21/9] max-h-[min(420px,55vh)] w-full sm:max-h-[420px]">
        <CmsRemoteImage
          src={s.image}
          alt={s.title}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ocean-900/80 to-transparent" />
        <div className="absolute bottom-0 left-0 p-5 sm:p-10">
          <h1 className="font-display text-2xl font-bold text-white sm:text-5xl">
            {s.title}
          </h1>
          <p className="mt-2 max-w-xl text-base text-white/90 sm:text-lg">
            {s.short}
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <ServiceDetailSections service={s} />
        <div className="mt-10">
          <ServiceDetailActions service={s} />
        </div>
      </div>
    </article>
  );
}
