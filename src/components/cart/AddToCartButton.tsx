"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

type ServiceProps = {
  variant: "service";
  slug: string;
  title: string;
  priceFrom: number;
  image?: string;
  duration?: string;
  includes?: string[];
  rating?: number;
  slotsLeft?: number;
  bookedToday?: number;
};

type PackageProps = {
  variant: "package";
  id: string;
  name: string;
  price: number;
  image?: string;
  duration?: string;
};

type Props = (ServiceProps | PackageProps) & {
  className?: string;
  size?: "sm" | "md";
};

export function AddToCartButton(props: Props) {
  const { addService, addPackage } = useCart();
  const [flash, setFlash] = useState(false);
  const size = props.size ?? "md";
  const base =
    size === "sm"
      ? "rounded-full border border-ocean-300 bg-white px-3 py-1.5 text-xs font-semibold text-ocean-800"
      : "rounded-full border-2 border-ocean-500 bg-white px-4 py-2 text-sm font-semibold text-ocean-800 shadow-sm";

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (props.variant === "service") {
      addService({
        slug: props.slug,
        title: props.title,
        priceFrom: props.priceFrom,
        image: props.image,
        duration: props.duration,
        includes: props.includes,
        rating: props.rating,
        slotsLeft: props.slotsLeft,
        bookedToday: props.bookedToday,
      });
    } else {
      addPackage({
        id: props.id,
        name: props.name,
        price: props.price,
        image: props.image,
        duration: props.duration,
      });
    }
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} transition hover:bg-ocean-50 ${props.className ?? ""} ${
        flash ? "ring-2 ring-ocean-400 ring-offset-2" : ""
      }`}
    >
      {flash ? "Added ✓" : "Add to cart"}
    </button>
  );
}
