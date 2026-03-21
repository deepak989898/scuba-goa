import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
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
  return {
    title: s.title,
    description: `${s.short} — book ${s.title.toLowerCase()} in Goa with WhatsApp or Razorpay.`,
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
        <Image
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
        <p className="text-base leading-relaxed text-ocean-800 sm:text-[17px]">
          Lock slots early during peak season. Live packages and services can be
          updated from the admin panel without redeploying.
        </p>
        <p className="mt-4 text-base leading-relaxed text-ocean-800 sm:text-[17px]">
          Tell us your hotel zone, group size, and preferred time—we route you to the
          right boat, cab, or club partner.{" "}
          <strong>Scuba diving Goa</strong> and{" "}
          <strong>water sports Goa booking</strong> combos are popular on weekends;
          ask for same-day feasibility before you pay.
        </p>
        <ServiceDetailActions service={s} />
      </div>
    </article>
  );
}
