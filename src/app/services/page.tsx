import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { services } from "@/data/services";

export const metadata: Metadata = {
  title: "All Services",
  description:
    "Scuba diving Goa, North & South tours, Dudhsagar, water sports, dolphin trips, casinos, clubs, pubs, disco, flyboarding, bungee.",
};

export default function ServicesPage() {
  return (
    <div className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold text-ocean-900">
          All services
        </h1>
        <p className="mt-3 max-w-2xl text-ocean-700">
          Every experience is mobile-optimized for quick WhatsApp or online pay. Tap
          through for deep pages and FAQs.
        </p>
        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/services/${s.slug}`}
                className="group block overflow-hidden rounded-2xl border border-ocean-100 bg-sand shadow-sm"
              >
                <div className="relative aspect-[16/10]">
                  <Image
                    src={s.image}
                    alt={s.title}
                    fill
                    className="object-cover transition group-hover:scale-105"
                    sizes="(max-width:1024px) 100vw, 33vw"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <h2 className="font-display text-xl font-semibold text-ocean-900">
                    {s.title}
                  </h2>
                  <p className="mt-1 text-sm text-ocean-600">{s.short}</p>
                  <p className="mt-2 text-sm font-semibold text-ocean-800">
                    From ₹{s.priceFrom.toLocaleString("en-IN")}+
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
