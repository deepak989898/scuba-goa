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

export function findPricedSubByCartKey(
  services: ServiceItem[],
  slug: string,
  subKey: string
): { service: ServiceItem; sub: SubServiceItem; index: number } | null {
  const service = services.find((x) => x.slug === slug);
  if (!service?.subServices?.length) return null;
  for (let i = 0; i < service.subServices.length; i++) {
    const sub = service.subServices[i]!;
    if (getSubServiceCartKey(sub, i) !== subKey) continue;
    if (
      sub.priceFrom != null &&
      Number.isFinite(sub.priceFrom) &&
      sub.priceFrom > 0
    ) {
      return { service, sub, index: i };
    }
  }
  return null;
}
