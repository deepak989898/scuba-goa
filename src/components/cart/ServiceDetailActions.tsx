"use client";

import Link from "next/link";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

type Props = {
  slug: string;
  title: string;
  priceFrom: number;
  image: string;
};

export function ServiceDetailActions({ slug, title, priceFrom, image }: Props) {
  return (
    <div className="mt-10 flex flex-wrap gap-3">
      <AddToCartButton
        variant="service"
        slug={slug}
        title={title}
        priceFrom={priceFrom}
        image={image}
      />
      <Link
        href="/booking"
        className="inline-flex items-center rounded-full bg-ocean-gradient px-6 py-3 text-sm font-semibold text-white shadow-md"
      >
        Book this experience
      </Link>
      <Link
        href="/services"
        className="inline-flex items-center rounded-full border border-ocean-200 px-6 py-3 text-sm font-semibold text-ocean-800"
      >
        All services
      </Link>
    </div>
  );
}
