import type { ServiceItem } from "@/data/services";
import {
  getPricedSubServicesWithIndex,
  getSubServiceCartKey,
} from "@/lib/service-sub-helpers";
import type { ChatBookingLine, PickOption } from "./types";

export type CategoryId =
  | "scuba"
  | "casino"
  | "flyboarding"
  | "bungee"
  | "sightseeing"
  | "dudhsagar"
  | "water-sports"
  | "night-club"
  | "others";

export const CATEGORIES: { id: CategoryId; label: string; match: RegExp }[] = [
  {
    id: "scuba",
    label: "Scuba diving",
    match: /scuba|diving|grand.?island|paradise.?island/i,
  },
  { id: "casino", label: "Casino", match: /casino/i },
  { id: "flyboarding", label: "Flyboarding", match: /flyboard/i },
  { id: "bungee", label: "Bungee Jumping", match: /bungee/i },
  {
    id: "sightseeing",
    label: "Sight Seen",
    match: /sight|north.?goa|south.?goa|tour|dolphin/i,
  },
  { id: "dudhsagar", label: "Dudhsagar", match: /dudhsagar|waterfall/i },
  { id: "water-sports", label: "Water Sports", match: /water.?sport/i },
  {
    id: "night-club",
    label: "Russian Night Club",
    match: /night.?club|russian|disco|pub/i,
  },
  { id: "others", label: "Others", match: /.*/ },
];

export const PICKUP_LOCATIONS = [
  "Baga Beach",
  "Calangute",
  "Candolim",
  "Panjim / City",
  "Goa Airport",
  "My hotel (North Goa)",
  "My hotel (South Goa)",
] as const;

export function serviceMatchesCategory(s: ServiceItem, cat: CategoryId): boolean {
  if (cat === "others") {
    return !CATEGORIES.filter((c) => c.id !== "others").some((c) =>
      c.match.test(`${s.slug} ${s.title} ${s.short}`),
    );
  }
  const def = CATEGORIES.find((c) => c.id === cat);
  if (!def) return false;
  return def.match.test(`${s.slug} ${s.title} ${s.short}`);
}

export function buildOptionsForCategory(
  services: ServiceItem[],
  cat: CategoryId,
): PickOption[] {
  const matched = services.filter((s) => serviceMatchesCategory(s, cat));
  const out: PickOption[] = [];

  for (const service of matched) {
    const priced = getPricedSubServicesWithIndex(service);
    if (priced.length > 0) {
      for (const { sub, index } of priced) {
        out.push({
          key: `${service.slug}__${getSubServiceCartKey(sub, index)}`,
          service,
          sub,
          subIndex: index,
          title: `${service.title} — ${sub.title}`,
          price: Number(sub.priceFrom),
          image: service.image,
          short: (sub.description || service.short || "").trim(),
          includes: sub.includes?.length
            ? sub.includes
            : service.includes ?? [],
          duration: service.duration,
          slotsLeft: sub.slotsLeft ?? service.slotsLeft,
          bookedToday: sub.bookedToday ?? service.bookedToday,
        });
      }
    } else if (service.priceFrom > 0) {
      out.push({
        key: service.slug,
        service,
        title: service.title,
        price: service.priceFrom,
        image: service.image,
        short: service.short,
        includes: service.includes ?? [],
        duration: service.duration,
        slotsLeft: service.slotsLeft,
        bookedToday: service.bookedToday,
      });
    }
  }

  return out;
}

export function pickOptionToCartLine(
  opt: PickOption,
  quantity: number,
): ChatBookingLine {
  const sub =
    opt.sub && opt.subIndex != null
      ? getSubServiceCartKey(opt.sub, opt.subIndex)
      : "";
  const key = sub
    ? `service:${opt.service.slug}:sub:${sub}`
    : `service:${opt.service.slug}`;
  const refId = sub ? `${opt.service.slug}#${sub}` : opt.service.slug;
  return {
    key,
    kind: "service",
    refId,
    name: opt.title,
    unitPrice: opt.price,
    quantity,
    lineTotal: opt.price * quantity,
    image: opt.image,
    duration: opt.duration,
    slotsLeft: opt.slotsLeft,
  };
}