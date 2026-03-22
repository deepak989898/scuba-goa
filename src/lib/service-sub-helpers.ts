import type { ServiceItem, SubServiceItem } from "@/data/services";

/** Stable key for cart + Firestore sub rows (matches admin “Cart id” when set). */
export function getSubServiceCartKey(
  sub: Pick<SubServiceItem, "id">,
  index: number
): string {
  const raw = sub.id?.trim();
  if (raw) {
    return (
      raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || `i${index}`
    );
  }
  return `i${index}`;
}

function isPricedSubService(sub: SubServiceItem): boolean {
  return (
    sub.priceFrom != null &&
    Number.isFinite(sub.priceFrom) &&
    sub.priceFrom > 0
  );
}

export function getPricedSubServicesWithIndex(s: ServiceItem): Array<{
  sub: SubServiceItem;
  index: number;
}> {
  if (!s.subServices?.length) return [];
  return s.subServices
    .map((sub, index) => ({ sub, index }))
    .filter(({ sub }) => isPricedSubService(sub));
}

export function serviceHasPricedSubServices(s: ServiceItem): boolean {
  return getPricedSubServicesWithIndex(s).length > 0;
}
