import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { PromoCopyButton } from "@/components/PromoCopyButton";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { fetchActiveOffersPublic } from "@/lib/server-offers";
import type { OfferDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offers & promo codes",
  description: `Online-only promo codes for ${SITE_NAME}. Copy a code and paste it on the booking page before Razorpay checkout.`,
  alternates: {
    canonical: `${SITE_URL.replace(/\/$/, "")}/offers`,
  },
};

type Accent = {
  stamp: string;
  codeBorder: string;
  codeText: string;
  label: string;
  ribbon?: boolean;
};

function offerAccent(o: OfferDoc, index: number): Accent {
  const cat = (o.category || "").toLowerCase();
  const min = Math.max(1, Math.floor(Number(o.minCartUnits ?? 1)));
  const max = o.maxCartUnits;
  const groupLabel =
    max != null && Number.isFinite(Number(max))
      ? `GROUP OF ${min} TO ${Math.floor(Number(max))}`
      : `LARGE GROUP OFFER`;

  if (cat.includes("birthday")) {
    return {
      stamp: "from-sky-600 to-blue-800",
      codeBorder: "border-sky-500",
      codeText: "text-sky-700",
      label: "BEST FOR BIRTHDAYS",
      ribbon: true,
    };
  }
  if (cat.includes("couple")) {
    return {
      stamp: "from-emerald-500 to-teal-700",
      codeBorder: "border-emerald-500",
      codeText: "text-emerald-700",
      label: "PERFECT FOR COUPLES",
    };
  }
  if (cat.includes("group") && (o.discountPercent ?? 0) >= 30) {
    return {
      stamp: "from-rose-500 to-pink-600",
      codeBorder: "border-rose-500",
      codeText: "text-rose-700",
      label: "LARGE GROUP OFFER",
    };
  }
  if (cat.includes("group") && (o.discountPercent ?? 0) >= 20) {
    return {
      stamp: "from-violet-500 to-purple-700",
      codeBorder: "border-violet-500",
      codeText: "text-violet-700",
      label: groupLabel,
    };
  }
  if (cat.includes("group")) {
    return {
      stamp: "from-orange-500 to-amber-600",
      codeBorder: "border-orange-500",
      codeText: "text-orange-700",
      label: groupLabel,
    };
  }
  const fallback: Accent[] = [
    {
      stamp: "from-sky-600 to-blue-800",
      codeBorder: "border-sky-500",
      codeText: "text-sky-700",
      label: "SPECIAL OFFER",
      ribbon: index === 0,
    },
    {
      stamp: "from-emerald-500 to-teal-700",
      codeBorder: "border-emerald-500",
      codeText: "text-emerald-700",
      label: "SPECIAL OFFER",
    },
    {
      stamp: "from-orange-500 to-amber-600",
      codeBorder: "border-orange-500",
      codeText: "text-orange-700",
      label: "SPECIAL OFFER",
    },
    {
      stamp: "from-violet-500 to-purple-700",
      codeBorder: "border-violet-500",
      codeText: "text-violet-700",
      label: "SPECIAL OFFER",
    },
    {
      stamp: "from-rose-500 to-pink-600",
      codeBorder: "border-rose-500",
      codeText: "text-rose-700",
      label: "SPECIAL OFFER",
    },
  ];
  return fallback[index % fallback.length]!;
}

function FeatureIcon({
  children,
  bg,
}: {
  children: ReactNode;
  bg: string;
}) {
  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${bg} text-white sm:h-7 sm:w-7`}
      aria-hidden
    >
      {children}
    </span>
  );
}

function OfferCard({ o, index }: { o: OfferDoc; index: number }) {
  const accent = offerAccent(o, index);
  const pct = Math.round(Number(o.discountPercent) || 0);

  return (
    <article className="relative flex min-h-0 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      {accent.ribbon ? (
        <span className="absolute -right-7 top-2 z-10 rotate-45 bg-sky-600 px-8 py-px text-[8px] font-extrabold uppercase tracking-wide text-white shadow">
          Popular
        </span>
      ) : null}

      <div
        className={`relative flex w-[4.25rem] shrink-0 flex-col items-center justify-center bg-gradient-to-b ${accent.stamp} px-1 py-2 text-center text-white sm:w-[5rem]`}
        style={{
          clipPath:
            "polygon(0 0, 88% 0, 100% 8%, 88% 16%, 100% 24%, 88% 32%, 100% 40%, 88% 48%, 100% 56%, 88% 64%, 100% 72%, 88% 80%, 100% 88%, 88% 100%, 0 100%)",
        }}
      >
        <p className="font-display text-xl font-black leading-none sm:text-2xl">
          {pct}%
        </p>
        <p className="text-[8px] font-extrabold uppercase tracking-[0.12em] sm:text-[9px]">
          Off
        </p>
        <svg
          className="mt-1 h-5 w-5 opacity-35 sm:h-6 sm:w-6"
          viewBox="0 0 48 48"
          fill="currentColor"
          aria-hidden
        >
          <ellipse cx="24" cy="28" rx="14" ry="8" />
          <path
            d="M18 22c2-6 10-6 12 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2.5 py-2 sm:gap-1 sm:px-3 sm:py-2.5">
        <p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-orange-600 sm:text-[9px]">
          {accent.label}
        </p>
        <h2 className="font-display text-sm font-extrabold leading-tight text-[#0b3d66] sm:text-base">
          {o.title}
        </h2>
        <p className="line-clamp-1 text-[11px] leading-snug text-slate-600 sm:line-clamp-2 sm:text-xs">
          {o.description}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold text-slate-500">
            Use Code
          </span>
          <span
            className={`rounded border border-dashed ${accent.codeBorder} bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-black tracking-wide ${accent.codeText} sm:text-xs`}
          >
            {o.promoCode}
          </span>
          <PromoCopyButton code={o.promoCode} variant="solid" />
        </div>
      </div>
    </article>
  );
}

export default async function OffersPage() {
  const offers = await fetchActiveOffersPublic();

  return (
    <div className="relative -mt-1 overflow-x-hidden pb-2 md:pb-4">
      {/* Short hero strip — peek of offer-header.webp behind the sheet */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[9.5rem] sm:h-[11rem] lg:h-[12.5rem]">
        <Image
          src="/offer-header.webp"
          alt=""
          fill
          priority
          quality={72}
          className="object-cover object-[center_35%]"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-sky-950/25 via-transparent to-[#dceef8]"
          aria-hidden
        />
      </div>

      <div className="mx-auto max-w-5xl px-2 pt-2 sm:px-4 sm:pt-3 lg:px-6">
        <div className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_12px_40px_rgba(8,40,80,0.14)] sm:rounded-[1.25rem]">
          {/* Compact intro */}
          <div className="px-3 pb-2 pt-3 text-center sm:px-5 sm:pt-3.5">
            <p className="inline-flex rounded bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.14em] text-white sm:text-[9px]">
              Online booking only
            </p>
            <h1 className="mt-1.5 font-display text-xl font-black uppercase tracking-tight text-[#0b3d66] sm:text-2xl lg:text-[1.65rem]">
              Offers &amp; Promo Codes
            </h1>
            <p className="mx-auto mt-0.5 max-w-xl text-[11px] leading-snug text-slate-600 sm:text-xs">
              Use the best promo codes &amp;{" "}
              <span className="font-bold text-orange-600">save more</span> on
              your scuba adventure in Goa!
            </p>

            <ul className="mx-auto mt-2 flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:gap-x-5">
              <li className="flex items-center gap-1.5">
                <FeatureIcon bg="bg-sky-600">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.8 7.1 18.2l.9-5.5-4-3.9L9.5 8 12 3z" />
                  </svg>
                </FeatureIcon>
                <span className="text-[9px] font-bold text-[#0b3d66] sm:text-[10px]">
                  Best Price Guaranteed
                </span>
              </li>
              <li className="flex items-center gap-1.5">
                <FeatureIcon bg="bg-emerald-600">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M12 3l7 3v5c0 4.5-2.8 8.4-7 10-4.2-1.6-7-5.5-7-10V6l7-3z" />
                  </svg>
                </FeatureIcon>
                <span className="text-[9px] font-bold text-[#0b3d66] sm:text-[10px]">
                  Safe &amp; Secure Payments
                </span>
              </li>
              <li className="flex items-center gap-1.5">
                <FeatureIcon bg="bg-violet-600">
                  <span className="text-[10px] font-black">%</span>
                </FeatureIcon>
                <span className="text-[9px] font-bold text-[#0b3d66] sm:text-[10px]">
                  Exclusive Online Offers
                </span>
              </li>
              <li className="flex items-center gap-1.5">
                <FeatureIcon bg="bg-orange-500">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </FeatureIcon>
                <span className="text-[9px] font-bold text-[#0b3d66] sm:text-[10px]">
                  Limited Time Deals
                </span>
              </li>
            </ul>
          </div>

          <div className="border-t border-slate-100 px-2 py-2.5 sm:px-3 sm:py-3">
            {offers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
                New offers soon —{" "}
                <Link
                  href="/booking"
                  className="font-semibold text-sky-700 underline"
                >
                  book online
                </Link>
                .
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5">
                {offers.map((o, i) => (
                  <OfferCard key={o.id} o={o} index={i} />
                ))}

                <div className="flex items-center gap-3 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 to-cyan-50 px-3 py-2.5 sm:gap-4">
                  <div className="relative h-14 w-14 shrink-0 sm:h-16 sm:w-16">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-sky-400 to-blue-700 shadow" />
                    <div className="absolute -top-1 left-1/2 h-2.5 w-10 -translate-x-1/2 rounded-sm bg-amber-400" />
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      aria-hidden
                    >
                      <svg
                        className="h-7 w-7 text-amber-200"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M20 7h-3.2A3 3 0 0012 3a3 3 0 00-4.8 4H4a1 1 0 00-1 1v3h18V8a1 1 0 00-1-1zM12 5a1 1 0 011 1h-2a1 1 0 011-1zM3 12v8a1 1 0 001 1h7v-9H3zm10 0v9h7a1 1 0 001-1v-8h-8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-display text-xs font-black uppercase tracking-tight text-[#0b3d66] sm:text-sm">
                      More dives, more savings!
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-600 sm:text-[11px]">
                      Bigger groups unlock bigger discounts online.
                    </p>
                    <p className="font-display text-[11px] font-bold italic text-sky-600 sm:text-xs">
                      Dive in &amp; Save Big!
                    </p>
                  </div>
                  <Link
                    href="/booking"
                    className="shrink-0 rounded-full bg-orange-500 px-2.5 py-1.5 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-orange-600 sm:px-3 sm:text-xs"
                  >
                    Book
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-1.5 border-t border-slate-100 bg-slate-50 px-2.5 py-1.5 sm:px-3">
            <span
              className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[8px] font-bold text-white"
              aria-hidden
            >
              i
            </span>
            <p className="text-[9px] leading-snug text-slate-600 sm:text-[10px]">
              <span className="font-bold text-slate-700">
                Terms &amp; Conditions:
              </span>{" "}
              Online bookings only. Not valid on walk-in / WhatsApp-only deals.
              One promo code per checkout — paste on{" "}
              <Link
                href="/booking"
                className="font-semibold text-sky-700 underline"
              >
                booking
              </Link>{" "}
              before payment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
