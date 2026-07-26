import { permanentRedirect, notFound } from "next/navigation";
import { getAllServicesServer } from "@/lib/get-services-server";
import {
  assignSubServicePublicSlugs,
  findSubByCartKey,
} from "@/lib/service-sub-helpers";

type Props = { params: Promise<{ slug: string; subSlug: string }> };

export const dynamic = "force-dynamic";

/**
 * Legacy nested URLs (/services/scuba-diving/grand-island) permanently
 * redirect to flat title URLs (/services/scuba-diving-in-grand-island).
 */
export default async function LegacySubServiceRedirect({ params }: Props) {
  const { slug, subSlug } = await params;
  const all = await getAllServicesServer();
  const byCart = findSubByCartKey(all, slug, subSlug);
  if (byCart) {
    const assigned = assignSubServicePublicSlugs(all).find(
      (e) =>
        e.service.slug === byCart.service.slug &&
        e.index === byCart.index,
    );
    if (assigned) {
      permanentRedirect(`/services/${assigned.publicSlug}`);
    }
  }

  // Also accept title slug as the second segment if someone bookmarked it.
  const byTitle = assignSubServicePublicSlugs(all).find(
    (e) => e.service.slug === slug && e.publicSlug === subSlug,
  );
  if (byTitle) {
    permanentRedirect(`/services/${byTitle.publicSlug}`);
  }

  notFound();
}
