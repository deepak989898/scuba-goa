import type { ServiceItem, SubServiceItem } from "@/data/services";

function slugifySegment(raw: string): string {
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || ""
  );
}

/**
 * Stable key for cart / booking (not the public URL).
 * Prefer admin Cart id → slugified title → i{index}.
 */
export function getSubServiceCartKey(
  sub: Pick<SubServiceItem, "id" | "title">,
  index: number,
): string {
  const fromId = sub.id?.trim() ? slugifySegment(sub.id) : "";
  if (fromId) return fromId;
  const fromTitle = sub.title?.trim() ? slugifySegment(sub.title) : "";
  if (fromTitle) return fromTitle;
  return `i${index}`;
}

/**
 * Public SEO slug under /services/{publicSlug}.
 * Prefer slugified title (e.g. "Scuba diving in Grand Island" → scuba-diving-in-grand-island).
 */
export function getSubServicePublicSlug(
  sub: Pick<SubServiceItem, "id" | "title">,
  index: number,
): string {
  const fromTitle = sub.title?.trim() ? slugifySegment(sub.title) : "";
  if (fromTitle) return fromTitle;
  return getSubServiceCartKey(sub, index);
}

export function isPricedSubService(sub: SubServiceItem): boolean {
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

/** All titled sub-services (for SEO landing pages — priced or not). */
export function getTitledSubServicesWithIndex(s: ServiceItem): Array<{
  sub: SubServiceItem;
  index: number;
  subKey: string;
  publicSlug: string;
}> {
  if (!s.subServices?.length) return [];
  return s.subServices
    .map((sub, index) => ({
      sub,
      index,
      subKey: getSubServiceCartKey(sub, index),
      publicSlug: getSubServicePublicSlug(sub, index),
    }))
    .filter(({ sub }) => Boolean(sub.title?.trim()));
}

export function serviceHasPricedSubServices(s: ServiceItem): boolean {
  return getPricedSubServicesWithIndex(s).length > 0;
}

export function getSubServicePublicPath(
  sub: Pick<SubServiceItem, "id" | "title">,
  index: number,
): string {
  return `/services/${getSubServicePublicSlug(sub, index)}`;
}

export type SubServicePathEntry = {
  parentSlug: string;
  subSlug: string;
  /** Flat public path, e.g. /services/scuba-diving-in-grand-island */
  path: string;
  title: string;
  cartKey: string;
};

/**
 * Assign unique flat public slugs across all services.
 * Parent service slugs are reserved so /services/scuba-diving stays the parent.
 */
export function assignSubServicePublicSlugs(
  services: readonly ServiceItem[],
): Array<{
  service: ServiceItem;
  sub: SubServiceItem;
  index: number;
  cartKey: string;
  publicSlug: string;
  path: string;
}> {
  const reserved = new Set(
    services.map((s) => s.slug).filter(Boolean),
  );
  const out: Array<{
    service: ServiceItem;
    sub: SubServiceItem;
    index: number;
    cartKey: string;
    publicSlug: string;
    path: string;
  }> = [];

  for (const s of services) {
    if (!s.slug || s.active === false) continue;
    for (const { sub, index, subKey } of getTitledSubServicesWithIndex(s)) {
      let publicSlug = getSubServicePublicSlug(sub, index);
      if (reserved.has(publicSlug)) {
        const alt = `${publicSlug}-${subKey}`;
        publicSlug = reserved.has(alt)
          ? `${s.slug}-${subKey}`
          : alt;
      }
      let n = 2;
      let candidate = publicSlug;
      while (reserved.has(candidate)) {
        candidate = `${publicSlug}-${n}`;
        n += 1;
      }
      publicSlug = candidate;
      reserved.add(publicSlug);
      out.push({
        service: s,
        sub,
        index,
        cartKey: subKey,
        publicSlug,
        path: `/services/${publicSlug}`,
      });
    }
  }
  return out;
}

/** Flatten all titled sub-services across a service list (sitemap / GSC). */
export function listSubServicePaths(
  services: readonly ServiceItem[],
): SubServicePathEntry[] {
  return assignSubServicePublicSlugs(services).map((e) => ({
    parentSlug: e.service.slug,
    subSlug: e.publicSlug,
    path: e.path,
    title: e.sub.title.trim(),
    cartKey: e.cartKey,
  }));
}

export function findSubByPublicSlug(
  services: readonly ServiceItem[],
  publicSlug: string,
): {
  service: ServiceItem;
  sub: SubServiceItem;
  index: number;
  subKey: string;
  publicSlug: string;
} | null {
  const key = publicSlug.trim().toLowerCase();
  if (!key) return null;
  for (const e of assignSubServicePublicSlugs(services)) {
    if (e.publicSlug === key) {
      return {
        service: e.service,
        sub: e.sub,
        index: e.index,
        subKey: e.cartKey,
        publicSlug: e.publicSlug,
      };
    }
  }
  return null;
}

export function findSubByCartKey(
  services: readonly ServiceItem[],
  slug: string,
  subKey: string,
): { service: ServiceItem; sub: SubServiceItem; index: number; subKey: string } | null {
  const service = services.find((x) => x.slug === slug);
  if (!service?.subServices?.length) return null;
  for (let i = 0; i < service.subServices.length; i++) {
    const sub = service.subServices[i]!;
    if (!sub.title?.trim()) continue;
    const key = getSubServiceCartKey(sub, i);
    if (key === subKey) {
      return { service, sub, index: i, subKey: key };
    }
  }
  return null;
}

export function findPricedSubByCartKey(
  services: readonly ServiceItem[],
  slug: string,
  subKey: string,
): { service: ServiceItem; sub: SubServiceItem; index: number } | null {
  const hit = findSubByCartKey(services, slug, subKey);
  if (!hit || !isPricedSubService(hit.sub)) return null;
  return { service: hit.service, sub: hit.sub, index: hit.index };
}
