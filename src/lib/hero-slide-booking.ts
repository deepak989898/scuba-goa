import type { ServiceItem } from "@/data/services";
import type { PackageDoc } from "@/lib/types";
import { parseBookingOption } from "@/lib/booking-selection";
import { findPricedSubByCartKey } from "@/lib/service-sub-helpers";

/** Booking page query param for encoded package/service selection from hero (and elsewhere). */
export const HERO_BOOKING_OPT_PARAM = "opt";

const DEFAULT_PERKS =
  "Beginner friendly · Safe · Certified trainers · Free photos & videos";
const DEFAULT_WA =
  "Hi, I want to book scuba diving in Goa. Please share slots for today or tomorrow.";

export type HeroBookingCardModel = {
  bookHref: string;
  headlineTitle: string;
  headlinePriceInr: number | null;
  slotsToday: number | null;
  perksLine: string;
  waPreset: string;
  primaryCtaLabel: string;
};

export function buildHeroBookingHref(encoded?: string | null): string {
  const e = encoded?.trim();
  if (!e) return "/booking";
  const q = new URLSearchParams();
  q.set(HERO_BOOKING_OPT_PARAM, e);
  return `/booking?${q.toString()}`;
}

function perksFromList(items: string[] | undefined, max: number): string {
  if (!items?.length) return "";
  return items
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max)
    .join(" · ");
}

export function resolveHeroBookingCardModel(
  bookingOption: string | undefined,
  ctx: {
    packages: PackageDoc[];
    services: ServiceItem[];
    fallbackHeadlinePrice: number | null;
    fallbackSlots: number | null;
  },
): HeroBookingCardModel {
  const opt = bookingOption?.trim();
  if (!opt) {
    return {
      bookHref: "/booking",
      headlineTitle: "Scuba diving in Goa",
      headlinePriceInr: ctx.fallbackHeadlinePrice,
      slotsToday: ctx.fallbackSlots,
      perksLine: DEFAULT_PERKS,
      waPreset: DEFAULT_WA,
      primaryCtaLabel: "Book now",
    };
  }

  const parsed = parseBookingOption(opt);
  if (!parsed) {
    return resolveHeroBookingCardModel(undefined, ctx);
  }

  const href = buildHeroBookingHref(opt);

  if (parsed.kind === "package") {
    const p = ctx.packages.find((x) => x.id === parsed.id);
    if (!p) {
      return {
        ...resolveHeroBookingCardModel(undefined, ctx),
        bookHref: href,
        primaryCtaLabel: "Book this now",
      };
    }
    const perks =
      perksFromList(p.includes, 4) ||
      "Book online · Razorpay + WhatsApp confirm";
    return {
      bookHref: href,
      headlineTitle: p.name,
      headlinePriceInr:
        Number.isFinite(p.price) && p.price > 0 ? p.price : null,
      slotsToday:
        p.slotsLeft != null && p.slotsLeft > 0 ? p.slotsLeft : null,
      perksLine: perks,
      waPreset: `Hi, I want to book ${p.name} in Goa. Please share slots and pickup.`,
      primaryCtaLabel: "Book this now",
    };
  }

  if (parsed.kind === "serviceSub") {
    const found = findPricedSubByCartKey(
      ctx.services,
      parsed.slug,
      parsed.subKey,
    );
    if (!found) {
      return {
        ...resolveHeroBookingCardModel(undefined, ctx),
        bookHref: href,
        primaryCtaLabel: "Book this now",
      };
    }
    const { service: s, sub } = found;
    const price = Number(sub.priceFrom);
    const perks =
      perksFromList(sub.includes, 3) ||
      perksFromList(s.includes, 3) ||
      s.short.trim();
    return {
      bookHref: href,
      headlineTitle: `${s.title} — ${sub.title}`,
      headlinePriceInr: Number.isFinite(price) && price > 0 ? price : null,
      slotsToday:
        sub.slotsLeft != null && sub.slotsLeft > 0
          ? sub.slotsLeft
          : s.slotsLeft != null && s.slotsLeft > 0
            ? s.slotsLeft
            : null,
      perksLine: perks,
      waPreset: `Hi, I want to book ${s.title} (${sub.title}) in Goa. Please share slots.`,
      primaryCtaLabel: "Book this now",
    };
  }

  const s = ctx.services.find((x) => x.slug === parsed.slug);
  if (!s) {
    return {
      ...resolveHeroBookingCardModel(undefined, ctx),
      bookHref: href,
      primaryCtaLabel: "Book this now",
    };
  }
  const perks =
    perksFromList(s.includes, 4) || s.short.trim() || DEFAULT_PERKS;
  return {
    bookHref: href,
    headlineTitle: s.title,
    headlinePriceInr:
      Number.isFinite(s.priceFrom) && s.priceFrom > 0 ? s.priceFrom : null,
    slotsToday:
      s.slotsLeft != null && s.slotsLeft > 0 ? s.slotsLeft : null,
    perksLine: perks,
    waPreset: `Hi, I want to book ${s.title} in Goa. Please share slots.`,
    primaryCtaLabel: "Book this now",
  };
}
