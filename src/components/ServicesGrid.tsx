"use client";

import Image from "next/image";
import Link from "next/link";
import { services } from "@/data/services";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

export function ServicesGrid() {
  return (
    <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => (
        <li
          key={s.slug}
          className="overflow-hidden rounded-2xl border border-ocean-100 bg-sand shadow-sm"
        >
          <Link href={`/services/${s.slug}`} className="group block">
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
          </Link>
          <div className="p-5">
            <Link href={`/services/${s.slug}`}>
              <h2 className="font-display text-xl font-semibold text-ocean-900 hover:text-ocean-600">
                {s.title}
              </h2>
            </Link>
            <p className="mt-1 text-sm text-ocean-600">{s.short}</p>
            <p className="mt-2 text-sm font-semibold text-ocean-800">
              From ₹{s.priceFrom.toLocaleString("en-IN")}+
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AddToCartButton
                variant="service"
                slug={s.slug}
                title={s.title}
                priceFrom={s.priceFrom}
                image={s.image}
                size="sm"
              />
              <Link
                href={`/services/${s.slug}`}
                className="rounded-full border border-ocean-200 px-3 py-1.5 text-xs font-semibold text-ocean-700 hover:bg-ocean-50"
              >
                View details
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
