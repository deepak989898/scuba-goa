import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HotelBookingProgress } from "@/components/hotels/HotelBookingProgress";
import { getGoaHotelBySlug, listGoaHotelSlugs } from "@/lib/goa-hotels/firestore";
import { SITE_URL } from "@/lib/constants";
import { HotelDetailClient } from "./HotelDetailClient";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await listGoaHotelSlugs(40);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hotel = await getGoaHotelBySlug(slug);
  if (!hotel) return { title: "Hotel" };

  const base = SITE_URL.replace(/\/$/, "");
  const description =
    hotel.description.slice(0, 155) ||
    `${hotel.name} in ${hotel.location} — book with Razorpay on Book Scuba Goa.`;

  return {
    title: `${hotel.name} — Goa hotel`,
    description,
    alternates: { canonical: `${base}/hotels/${hotel.slug}` },
    openGraph: {
      title: hotel.name,
      description,
      images: hotel.heroImage ? [{ url: hotel.heroImage }] : undefined,
    },
  };
}

export default async function HotelDetailPage({ params }: Props) {
  const { slug } = await params;
  const hotel = await getGoaHotelBySlug(slug);
  if (!hotel) notFound();

  return (
    <div className="bg-white py-8 sm:py-12">
      <div className="site-container max-w-6xl">
        <HotelBookingProgress />
        <HotelDetailClient hotel={hotel} />
      </div>
    </div>
  );
}
