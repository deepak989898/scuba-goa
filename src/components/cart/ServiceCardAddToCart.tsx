"use client";

import { useEffect, useRef, useState } from "react";
import type { ServiceItem } from "@/data/services";
import { useCart } from "@/context/CartContext";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import {
  getPricedSubServicesWithIndex,
  getSubServiceCartKey,
  serviceHasPricedSubServices,
} from "@/lib/service-sub-helpers";

type Props = {
  service: ServiceItem;
  size?: "sm" | "md";
  className?: string;
};

export function ServiceCardAddToCart({ service: s, size = "md", className }: Props) {
  const { addService } = useCart();
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const priced = getPricedSubServicesWithIndex(s);
  const hasDropdown = serviceHasPricedSubServices(s);

  const base =
    size === "sm"
      ? "min-h-11 rounded-full border border-ocean-300 bg-white px-3 py-2 text-xs font-semibold text-ocean-800"
      : "min-h-11 rounded-full border-2 border-ocean-500 bg-white px-4 py-2 text-sm font-semibold text-ocean-800 shadow-sm";

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!hasDropdown) {
    return (
      <AddToCartButton
        variant="service"
        slug={s.slug}
        title={s.title}
        priceFrom={s.priceFrom}
        image={s.image}
        duration={s.duration}
        includes={s.includes}
        rating={s.rating}
        slotsLeft={s.slotsLeft}
        bookedToday={s.bookedToday}
        size={size}
        className={className}
      />
    );
  }

  function pickSub(
    sub: (typeof priced)[number]["sub"],
    index: number
  ) {
    const subKey = getSubServiceCartKey(sub, index);
    addService({
      slug: s.slug,
      title: `${s.title} — ${sub.title}`,
      priceFrom: sub.priceFrom!,
      subKey,
      image: s.image,
      duration: s.duration,
      includes: sub.includes ?? s.includes,
      rating: s.rating,
      slotsLeft: s.slotsLeft,
      bookedToday: s.bookedToday,
    });
    setOpen(false);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1200);
  }

  return (
    <div className={`relative inline-block ${className ?? ""}`} ref={wrapRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        className={`${base} transition hover:bg-ocean-50 ${
          flash ? "ring-2 ring-ocean-400 ring-offset-2" : ""
        }`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {flash ? "Added ✓" : "Add to cart ▾"}
      </button>
      {open ? (
        <ul
          className="absolute left-0 top-full z-50 mt-1 min-w-[220px] max-w-[min(100vw-2rem,320px)] overflow-hidden rounded-xl border border-ocean-200 bg-white py-1 shadow-lg"
          role="menu"
          aria-label={`${s.title} — choose variant`}
        >
          {priced.map(({ sub, index }) => (
            <li key={getSubServiceCartKey(sub, index)} role="none">
              <button
                type="button"
                role="menuitem"
                className="w-full px-3 py-2.5 text-left text-xs text-ocean-900 transition hover:bg-ocean-50 sm:text-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pickSub(sub, index);
                }}
              >
                <span className="font-semibold">{sub.title}</span>
                <span className="mt-0.5 block text-ocean-600">
                  ₹{sub.priceFrom!.toLocaleString("en-IN")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
