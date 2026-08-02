import type { Metadata } from "next";
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

function OfferCard({ o, index }: { o: OfferDoc; index: number }) {
  const accent = offerAccent(o, index);
  const pct = Math.round(Number(o.discountPercent) || 0);

  return (
    <article className="relative flex overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
      {accent.ribbon ? (
        <span className="absolute -right-7 top-1.5 z-10 rotate-45 bg-sky-600 px-7 py-px text-[7px] font-extrabold uppercase tracking-wide text-white shadow">
          Popular
        </span>
      ) : null}

      <div
        className={`relative flex w-12 shrink-0 flex-col items-center justify-center bg-gradient-to-b ${accent.stamp} px-0.5 py-1.5 text-center text-white sm:w-14`}
        style={{
          clipPath:
            "polygon(0 0, 88% 0, 100% 8%, 88% 16%, 100% 24%, 88% 32%, 100% 40%, 88% 48%, 100% 56%, 88% 64%, 100% 72%, 88% 80%, 100% 88%, 88% 100%, 0 100%)",
        }}
      >
        <p className="font-display text-base font-black leading-none sm:text-lg">
          {pct}%
        </p>
        <p className="text-[7px] font-extrabold uppercase tracking-[0.1em] sm:text-[8px]">
          Off
        </p>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 sm:px-2.5 sm:py-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-[7px] font-extrabold uppercase tracking-[0.08em] text-orange-600 sm:text-[8px]">
            {accent.label}
          </p>
          <h2 className="font-display text-[13px] font-extrabold leading-tight text-[#0b3d66] sm:text-sm">
            {o.title}
          </h2>
          <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-slate-600">
            {o.description}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="text-[9px] font-semibold text-slate-500">Code</span>
            <span
              className={`rounded border border-dashed ${accent.codeBorder} bg-slate-50 px-1 py-px font-mono text-[10px] font-black tracking-wide ${accent.codeText}`}
            >
              {o.promoCode}
            </span>
          </div>
        </div>
        <PromoCopyButton
          code={o.promoCode}
          variant="solid"
          className="shrink-0 !min-h-0 !rounded-md !px-2 !py-1 !text-[10px] sm:!text-[11px]"
        />
      </div>
    </article>
  );
}

export default async function OffersPage() {
  const offers = await fetchActiveOffersPublic();

  return (
    <div className="relative overflow-x-hidden pb-2 md:pb-4">
      {/* Full-width hero; natural scale, then clip 150px from the bottom */}
      <div
        className="relative w-full overflow-hidden bg-[#6eb8d8]"
        style={{
          height: "max(11rem, calc(100vw * 793 / 1983 - 150px))",
        }}
      >
        <Image
          src="/offer-header.webp"
          alt="Offers and promo codes — Book Scuba Goa"
          width={1983}
          height={793}
          priority
          quality={80}
          className="absolute inset-x-0 top-0 block h-auto w-full max-w-none"
          sizes="100vw"
        />
        <h1 className="sr-only">Offers &amp; Promo Codes</h1>
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-2 pt-3 sm:px-4 sm:pt-4 lg:px-6">
        <div className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_12px_40px_rgba(8,40,80,0.14)] sm:rounded-[1.25rem]">
          <div className="px-2 py-2 sm:px-3 sm:py-2.5">
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
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2">
                {offers.map((o, i) => (
                  <OfferCard key={o.id} o={o} index={i} />
                ))}

                <div className="flex items-center gap-2.5 rounded-lg border border-sky-100 bg-gradient-to-r from-sky-50 to-cyan-50 px-2.5 py-1.5 sm:gap-3">
                  <div className="relative h-10 w-10 shrink-0 sm:h-11 sm:w-11">
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-sky-400 to-blue-700 shadow" />
                    <div className="absolute -top-0.5 left-1/2 h-2 w-7 -translate-x-1/2 rounded-sm bg-amber-400" />
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      aria-hidden
                    >
                      <svg
                        className="h-5 w-5 text-amber-200"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M20 7h-3.2A3 3 0 0012 3a3 3 0 00-4.8 4H4a1 1 0 00-1 1v3h18V8a1 1 0 00-1-1zM12 5a1 1 0 011 1h-2a1 1 0 011-1zM3 12v8a1 1 0 001 1h7v-9H3zm10 0v9h7a1 1 0 001-1v-8h-8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-display text-[11px] font-black uppercase tracking-tight text-[#0b3d66] sm:text-xs">
                      More dives, more savings!
                    </p>
                    <p className="line-clamp-1 text-[9px] text-slate-600 sm:text-[10px]">
                      Bigger groups unlock bigger discounts online.
                    </p>
                  </div>
                  <Link
                    href="/booking"
                    className="shrink-0 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-orange-600 sm:text-[11px]"
                  >
                    Book
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-1.5 border-t border-slate-100 bg-slate-50 px-2.5 py-1 sm:px-3">
            <span
              className="mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[7px] font-bold text-white"
              aria-hidden
            >
              i
            </span>
            <p className="text-[8px] leading-snug text-slate-600 sm:text-[9px]">
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
