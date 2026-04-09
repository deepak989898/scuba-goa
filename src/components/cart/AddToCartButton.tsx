"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";

type ServiceProps = {
  variant: "service";
  slug: string;
  title: string;
  priceFrom: number;
  /** Sub-service variant — separate cart line from the parent service */
  subKey?: string;
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

/** Shared look for cart CTAs on cards (AddToCartButton + ServiceCardAddToCart). */
export function addToCartButtonClasses(size: "sm" | "md"): string {
  if (size === "sm") {
    return "min-h-8 rounded-full border-2 border-cyan-300/90 bg-ocean-800 px-2 py-1 text-[10px] font-extrabold text-white shadow-md shadow-ocean-950/30 transition hover:bg-ocean-700 hover:border-cyan-200 active:brightness-95 sm:min-h-11 sm:px-3 sm:py-2 sm:text-xs";
  }
  return "min-h-9 rounded-full border-2 border-cyan-400 bg-ocean-gradient px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-ocean-950/35 transition hover:brightness-110 active:brightness-95 sm:min-h-11 sm:px-4 sm:py-2 sm:text-sm";
}

export function AddToCartButton(props: Props) {
  const { addService, addPackage } = useCart();
  const [flash, setFlash] = useState(false);
  const size = props.size ?? "md";
  const base = addToCartButtonClasses(size);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (props.variant === "service") {
      addService({
        slug: props.slug,
        title: props.title,
        priceFrom: props.priceFrom,
        subKey: props.subKey,
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
      className={`${base} ${props.className ?? ""} ${
        flash ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-white" : ""
      }`}
    >
      {flash ? "Added ✓" : "Add to cart"}
    </button>
  );
}
