"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
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

type MenuPos = { top: number; left: number; minWidth: number };

export function ServiceCardAddToCart({ service: s, size = "md", className }: Props) {
  const { addService } = useCart();
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos>({ top: 0, left: 0, minWidth: 220 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const priced = getPricedSubServicesWithIndex(s);
  const hasDropdown = serviceHasPricedSubServices(s);

  const base =
    size === "sm"
      ? "min-h-11 rounded-full border border-ocean-300 bg-white px-3 py-2 text-xs font-semibold text-ocean-800"
      : "min-h-11 rounded-full border-2 border-ocean-500 bg-white px-4 py-2 text-sm font-semibold text-ocean-800 shadow-sm";

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    function updatePosition() {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const padding = 8;
      const menuWidth = Math.max(220, r.width);
      let left = r.left;
      if (left + menuWidth > vw - padding) {
        left = Math.max(padding, vw - padding - menuWidth);
      }
      setMenuPos({
        top: r.bottom + 6,
        left,
        minWidth: menuWidth,
      });
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
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
      slotsLeft: sub.slotsLeft ?? s.slotsLeft,
      bookedToday: sub.bookedToday ?? s.bookedToday,
    });
    setOpen(false);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1200);
  }

  const menu = open && mounted ? (
    <ul
      ref={menuRef}
      role="menu"
      aria-label={`${s.title} — choose variant`}
      style={{
        position: "fixed",
        top: menuPos.top,
        left: menuPos.left,
        minWidth: menuPos.minWidth,
      }}
      className="z-[400] max-h-[min(70vh,320px)] overflow-y-auto rounded-xl border border-ocean-200 bg-white py-1 shadow-xl"
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
            {sub.slotsLeft != null || sub.bookedToday != null ? (
              <span className="mt-1 block text-[10px] text-ocean-500">
                {sub.slotsLeft != null ? `${sub.slotsLeft} left` : null}
                {sub.slotsLeft != null && sub.bookedToday != null ? " · " : null}
                {sub.bookedToday != null ? `${sub.bookedToday} booked today` : null}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <button
        ref={btnRef}
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
      {menu && typeof document !== "undefined"
        ? createPortal(menu, document.body)
        : null}
    </div>
  );
}
