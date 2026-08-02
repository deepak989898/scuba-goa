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
  ribbon?: boolean;
};

const ACCENTS: Accent[] = [
  { stamp: "from-sky-600 to-blue-800", codeBorder: "border-sky-500", codeText: "text-sky-700", ribbon: true },
  { stamp: "from-emerald-500 to-teal-700", codeBorder: "border-emerald-500", codeText: "text-emerald-700" },
  { stamp: "from-orange-500 to-amber-600", codeBorder: "border-orange-500", codeText: "text-orange-700" },
  { stamp: "from-violet-500 to-purple-700", codeBorder: "border-violet-500", codeText: "text-violet-700" },
  { stamp: "from-rose-500 to-pink-600", codeBorder: "border-rose-500", codeText: "text-rose-700" },
  { stamp: "from-cyan-600 to-ocean-800", codeBorder: "border-cyan-500", codeText: "text-cyan-800" },
];

function accentFor(o: OfferDoc, index: number): Accent {
  const cat = (o.category || "").toLowerCase();
  if (cat.includes("birthday")) return ACCENTS[0]!;
  if (cat.includes("couple")) return ACCENTS[1]!;
  if (cat.includes("group") && (o.discountPercent ?? 0) >= 30) return ACCENTS[4]!;
  if (cat.includes("group") && (o.discountPercent ?? 0) >= 20) return ACCENTS[3]!;
  if (cat.includes("group")) return ACCENTS[2]!;
  return ACCENTS[index % ACCENTS.length]!;
}

function categoryEyebrow(o: OfferDoc): string {
  const cat = (o.category || "Offer").trim();
  const upper = cat.toUpperCase();
  if (upper.includes("BIRTHDAY")) return "BEST FOR BIRTHDAYS";
  if (upper.includes("COUPLE")) return "BEST FOR COUPLES";
  if (upper.includes("GROUP")) {
    const min = Math.max(1, Math.floor(Number(o.minCartUnits ?? 1)));
    const max = o.maxCartUnits;
    if (max != null && Number.isFinite(Number(max))) {
      return `BEST FOR GROUPS ${min}–${Math.floor(Number(max))}`;
    }
    return `BEST FOR GROUPS ${min}+`;
  }
  return `BEST FOR ${upper}`;
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
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg} text-white shadow-sm`}
      aria-hidden
    >
      {children}
    </span>
  );
}

function OfferCard({ o, index }: { o: OfferDoc; index: number }) {
  const accent = accentFor(o, index);
  const pct = Math.round(Number(o.discountPercent) || 0);

  return (
    <article className="relative flex overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgba(15,60,100,0.08)]">
      {accent.ribbon ? (
        <span className="absolute -right-8 top-3 z-10 rotate-45 bg-sky-600 px-10 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow">
          Popular
        </span>
      ) : null}

      {/* Stamp / % OFF */}
      <div
        className={`relative flex w-[5.5rem] shrink-0 flex-col items-center justify-center bg-gradient-to-b ${accent.stamp} px-2 py-4 text-center text-white sm:w-28`}
        style={{
          clipPath:
            "polygon(0 0, 88% 0, 100% 8%, 88% 16%, 100% 24%, 88% 32%, 100% 40%, 88% 48%, 100% 56%, 88% 64%, 100% 72%, 88% 80%, 100% 88%, 88% 100%, 0 100%)",
        }}
      >
        <p className="font-display text-2xl font-black leading-none sm:text-3xl">
          {pct}%
        </p>
        <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] sm:text-xs">
          Off
        </p>
        <svg
          className="mt-3 h-8 w-8 opacity-40 sm:h-10 sm:w-10"
          viewBox="0 0 48 48"
          fill="currentColor"
          aria-hidden
        >
          <ellipse cx="24" cy="28" rx="14" ry="8" />
          <path d="M18 22c2-6 10-6 12 0" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="20" cy="18" r="2" />
          <circle cx="28" cy="18" r="2" />
        </svg>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-3.5 sm:p-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
          {categoryEyebrow(o)}
        </p>
        <h2 className="font-display text-lg font-extrabold leading-snug text-[#0b3d66] sm:text-xl">
          {o.title}
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">{o.description}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Use Code</span>
          <span
            className={`rounded-md border-2 border-dashed ${accent.codeBorder} bg-slate-50 px-2.5 py-1 font-mono text-sm font-black tracking-wider ${accent.codeText}`}
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
    <div className="relative min-h-[70vh] overflow-x-hidden">
      {/* Full-bleed header image (user Downloads → offer-header.webp) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[min(72vh,640px)]">
        <Image
          src="/offer-header.webp"
          alt=""
          fill
          priority
          quality={78}
          className="object-cover object-center"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-sky-950/35 via-sky-900/20 to-[#e8f4fc]"
          aria-hidden
        />
      </div>

      <div className="mx-auto max-w-5xl px-3 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        {/* White sheet matching reference */}
        <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/95 shadow-[0_20px_60px_rgba(8,40,80,0.18)] backdrop-blur-sm sm:rounded-[2rem]">
          <div className="px-4 pb-6 pt-8 text-center sm:px-8 sm:pt-10">
            <p className="inline-flex rounded-md bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white shadow-sm">
              Online booking only
            </p>
            <h1 className="mt-4 font-display text-3xl font-black uppercase tracking-tight text-[#0b3d66] sm:text-4xl md:text-5xl">
              Offers &amp; Promo Codes
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
              Use the best promo codes &amp;{" "}
              <span className="font-bold text-orange-600">save more</span> on your
              scuba adventure in Goa!
            </p>

            <ul className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-3 text-left sm:grid-cols-4 sm:gap-4">
              <li className="flex items-center gap-2 rounded-xl bg-sky-50/80 px-2 py-2">
                <FeatureIcon bg="bg-sky-600">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.8 7.1 18.2l.9-5.5-4-3.9L9.5 8 12 3z" />
                  </svg>
                </FeatureIcon>
                <span className="text-[11px] font-bold leading-tight text-[#0b3d66] sm:text-xs">
                  Best Price Guaranteed
                </span>
              </li>
              <li className="flex items-center gap-2 rounded-xl bg-emerald-50/80 px-2 py-2">
                <FeatureIcon bg="bg-emerald-600">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3l7 3v5c0 4.5-2.8 8.4-7 10-4.2-1.6-7-5.5-7-10V6l7-3z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </FeatureIcon>
                <span className="text-[11px] font-bold leading-tight text-[#0b3d66] sm:text-xs">
                  Safe &amp; Secure Payments
                </span>
              </li>
              <li className="flex items-center gap-2 rounded-xl bg-violet-50/80 px-2 py-2">
                <FeatureIcon bg="bg-violet-600">
                  <span className="text-sm font-black">%</span>
                </FeatureIcon>
                <span className="text-[11px] font-bold leading-tight text-[#0b3d66] sm:text-xs">
                  Exclusive Online Offers
                </span>
              </li>
              <li className="flex items-center gap-2 rounded-xl bg-orange-50/80 px-2 py-2">
                <FeatureIcon bg="bg-orange-500">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </FeatureIcon>
                <span className="text-[11px] font-bold leading-tight text-[#0b3d66] sm:text-xs">
                  Limited Time Deals
                </span>
              </li>
            </ul>
          </div>

          <div className="border-t border-slate-100 px-3 py-6 sm:px-6 sm:py-8">
            {offers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                <p className="text-slate-600">
                  New offers are on the way. You can still{" "}
                  <Link href="/booking" className="font-semibold text-sky-700 underline">
                    book online
                  </Link>{" "}
                  anytime.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                {offers.map((o, i) => (
                  <OfferCard key={o.id} o={o} index={i} />
                ))}

                {/* Closing promo tile (reference gift card) */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 text-center shadow-[0_8px_30px_rgba(15,60,100,0.06)] sm:p-7">
                  <div className="relative mb-4 h-24 w-24 shrink-0">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 shadow-lg" />
                    <div className="absolute -top-2 left-1/2 h-3.5 w-14 -translate-x-1/2 rounded-sm bg-amber-400 shadow" />
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      aria-hidden
                    >
                      <svg
                        className="h-12 w-12 text-amber-200"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M20 7h-3.2A3 3 0 0012 3a3 3 0 00-4.8 4H4a1 1 0 00-1 1v3h18V8a1 1 0 00-1-1zM12 5a1 1 0 011 1h-2a1 1 0 011-1zM3 12v8a1 1 0 001 1h7v-9H3zm10 0v9h7a1 1 0 001-1v-8h-8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-lg font-black uppercase tracking-tight text-[#0b3d66] sm:text-xl">
                      More dives, more savings!
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Bigger groups unlock bigger discounts — add people, copy a code,
                      pay online.
                    </p>
                    <p className="mt-3 font-display text-base font-bold italic text-sky-600">
                      Dive in &amp; Save Big!
                    </p>
                    <Link
                      href="/booking"
                      className="mt-4 inline-flex rounded-full bg-orange-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:bg-orange-600"
                    >
                      Reserve Your Dive
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3.5 text-left sm:px-6">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[11px] font-bold text-slate-700"
              aria-hidden
            >
              i
            </span>
            <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
              Offers are valid only on online bookings. Promo codes are not valid on
              walk-in bookings or WhatsApp-only deals. Codes cannot be combined with
              other offers — only one promo code applies per checkout. Paste your code
              on the{" "}
              <Link href="/booking" className="font-semibold text-sky-700 underline">
                booking page
              </Link>{" "}
              before Razorpay payment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
