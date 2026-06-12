import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { fallbackPackages } from "@/data/fallback-packages";
import {
  getPackageByIdServer,
} from "@/lib/get-packages-server";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import {
  buildShareOpenGraph,
  buildShareTwitter,
  pickShareImageUrl,
} from "@/lib/og-metadata";
import { ADVANCE_BOOKING_INR } from "@/lib/payment";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return fallbackPackages.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pkg = await getPackageByIdServer(id);
  if (!pkg) return { title: "Package" };

  const baseUrl = SITE_URL.replace(/\/$/, "");
  const canonical = `${baseUrl}/packages/${id}`;
  const title = `${pkg.name} — ₹${pkg.price.toLocaleString("en-IN")} | ${SITE_NAME}`;
  const description = `${pkg.name} in Goa · ${pkg.duration} · from ₹${pkg.price.toLocaleString("en-IN")}. Book online with ₹${ADVANCE_BOOKING_INR} advance on Razorpay.`;

  return {
    title: pkg.name,
    description,
    alternates: { canonical },
    openGraph: buildShareOpenGraph({
      title: pkg.name,
      description,
      url: canonical,
      imageUrl: pkg.imageUrl,
      imageAlt: pkg.name,
    }),
    twitter: buildShareTwitter({
      title: pkg.name,
      description,
      imageUrl: pkg.imageUrl,
    }),
  };
}

export default async function PackageSharePage({ params }: Props) {
  const { id } = await params;
  const pkg = await getPackageByIdServer(id);
  if (!pkg) notFound();

  const image = pickShareImageUrl(pkg.imageUrl);

  return (
    <article className="bg-white py-10 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-ocean-100">
          <CmsRemoteImage
            src={image}
            alt={pkg.name}
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 672px"
            priority
          />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ocean-600">
          {pkg.category ?? "Goa experience"}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ocean-900 sm:text-4xl">
          {pkg.name}
        </h1>
        <p className="mt-2 text-sm text-ocean-700">
          {pkg.duration} · Rating {pkg.rating.toFixed(1)}/5
        </p>
        <p className="mt-4 font-display text-3xl font-extrabold tabular-nums text-ocean-900">
          ₹{pkg.price.toLocaleString("en-IN")}
        </p>
        {pkg.includes?.length ? (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ocean-800">
            {pkg.includes.map((inc) => (
              <li key={inc}>{inc}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/booking?package=${encodeURIComponent(pkg.id)}`}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-ocean-gradient px-8 py-3 text-sm font-bold text-white shadow-lg"
          >
            Book this package
          </Link>
          <Link
            href="/booking"
            className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-ocean-300 px-6 py-3 text-sm font-semibold text-ocean-800"
          >
            All packages
          </Link>
        </div>
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
            Share this package
          </p>
          <div className="mt-2">
            <SocialShareButtons title={pkg.name} path={`/packages/${pkg.id}`} />
          </div>
        </div>
      </div>
    </article>
  );
}
