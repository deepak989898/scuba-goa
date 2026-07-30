"use client";

import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import type { ServiceItem } from "@/data/services";

type PromoProps = {
  promoDraft: string;
  setPromoDraft: (v: string) => void;
  promoBusy: boolean;
  promoApplied: {
    code: string;
    title: string;
    discountPercent: number;
  } | null;
  onApply: () => void;
  onClear: () => void;
};

type Props = {
  services: ServiceItem[];
  promo: PromoProps;
};

const BENEFITS = [
  {
    title: "No Hidden Charges",
    desc: "What you see is what you pay",
    color: "bg-sky-100 text-sky-700",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
      </svg>
    ),
  },
  {
    title: "Flexible Booking",
    desc: "Easy reschedule & cancellation",
    color: "bg-cyan-100 text-cyan-700",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M12 6v3l4-4-4-4v3a8 8 0 11-8 8h2a6 6 0 106-6z" />
      </svg>
    ),
  },
  {
    title: "Best Price Guarantee",
    desc: "We match the best prices",
    color: "bg-amber-100 text-amber-700",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M12 1l3 5 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1 3-5z" />
      </svg>
    ),
  },
  {
    title: "24/7 Support",
    desc: "We're here to help you",
    color: "bg-emerald-100 text-emerald-700",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M4 4h16v12H7l-3 3V4zm3 5v2h10V9H7zm0 4v2h7v-2H7z" />
      </svg>
    ),
  },
] as const;

const GALLERY_SLUGS = [
  "scuba-diving",
  "water-sports",
  "flyboarding",
  "dolphin-trip",
  "bungee-jumping",
] as const;

function shortLabel(title: string): string {
  return title
    .replace(/\s+in\s+Goa$/i, "")
    .replace(/\s*\(.*\)$/, "")
    .trim();
}

export function BookingSidePanel({ services, promo }: Props) {
  const bySlug = new Map(services.map((s) => [s.slug, s]));
  const tiles = GALLERY_SLUGS.map((slug) => bySlug.get(slug)).filter(
    Boolean,
  ) as ServiceItem[];
  const moreCount = Math.max(0, services.filter((s) => s.active !== false).length - tiles.length);

  return (
    <aside className="space-y-4 lg:sticky lg:top-20">
      <div className="rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 p-4 text-white shadow-lg sm:p-5">
        <p className="text-base font-bold sm:text-lg">Have a Promo Code?</p>
        <p className="mt-1 text-xs text-white/90 sm:text-sm">
          Enter code to get special offers.{" "}
          <Link href="/offers" className="font-semibold underline underline-offset-2">
            See offers
          </Link>
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            className="min-w-0 flex-1 rounded-xl border-0 bg-white px-3 py-2.5 text-sm font-medium text-ocean-900 placeholder:text-ocean-400 shadow-sm"
            placeholder="e.g. COUPLE10"
            value={promo.promoDraft}
            onChange={(e) => promo.setPromoDraft(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            disabled={
              promo.promoBusy || (!promo.promoApplied && !promo.promoDraft.trim())
            }
            onClick={promo.onApply}
            className="shrink-0 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-extrabold text-ocean-950 shadow-sm transition hover:bg-amber-200 disabled:opacity-50"
          >
            {promo.promoBusy ? "…" : promo.promoApplied ? "Applied" : "Apply"}
          </button>
        </div>
        {promo.promoApplied ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span>
              {promo.promoApplied.title} — {promo.promoApplied.discountPercent}% off
            </span>
            <button
              type="button"
              onClick={promo.onClear}
              className="rounded-full bg-white/20 px-2 py-0.5 underline"
            >
              Remove
            </button>
          </div>
        ) : null}
      </div>

      <ul className="space-y-2.5 rounded-2xl border border-ocean-100 bg-white p-4 shadow-sm">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex items-start gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${b.color}`}
            >
              {b.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ocean-900">{b.title}</p>
              <p className="text-xs text-ocean-600">{b.desc}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {tiles.map((s) => (
          <Link
            key={s.slug}
            href={`/services/${s.slug}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-xl shadow-sm ring-1 ring-ocean-100"
          >
            <CmsRemoteImage
              src={s.image}
              alt={s.title}
              fill
              className="object-cover transition duration-300 group-hover:scale-105"
              sizes="160px"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ocean-950/90 to-transparent px-2 pb-2 pt-6 text-[11px] font-bold text-white">
              {shortLabel(s.title)}
            </span>
          </Link>
        ))}
        <Link
          href="/services"
          className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-sm ring-1 ring-ocean-100"
        >
          <CmsRemoteImage
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=75"
            alt="More adventures in Goa"
            fill
            className="object-cover"
            sizes="160px"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-ocean-950/55 px-2 text-center text-sm font-extrabold text-white">
            +{Math.max(moreCount, 5)} More Adventures
          </span>
        </Link>
      </div>
    </aside>
  );
}
