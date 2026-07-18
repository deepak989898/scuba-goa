import { getAllPackagesServer } from "@/lib/get-packages-server";
import { getAllServicesServer } from "@/lib/get-services-server";
import type { PricingTarget } from "@/lib/pricing-agent/types";

export async function listActivePricingTargets(): Promise<PricingTarget[]> {
  const [packages, services] = await Promise.all([
    getAllPackagesServer(),
    getAllServicesServer(),
  ]);

  const pkgTargets: PricingTarget[] = packages
    .filter((p) => p.active !== false && p.price > 0)
    .map((p) => ({
      id: `package:${p.id}`,
      kind: "package" as const,
      name: p.name,
      category: p.category?.trim() || "package",
      locationHint: "Goa",
      duration: p.duration,
      includes: p.includes ?? [],
      currentPrice: Math.round(p.price),
      imageUrl: p.imageUrl?.trim() || "",
      active: true,
    }));

  const svcTargets: PricingTarget[] = services
    .filter((s) => s.active !== false && s.priceFrom > 0)
    .map((s) => ({
      id: `service:${s.slug}`,
      kind: "service" as const,
      name: s.title,
      category: s.slug,
      locationHint: "Goa",
      duration: s.duration,
      includes: s.includes ?? [],
      currentPrice: Math.round(s.priceFrom),
      imageUrl: s.image?.trim() || "",
      active: true,
    }));

  return [...svcTargets, ...pkgTargets];
}

export function buildSearchQueries(target: PricingTarget): string[] {
  const name = target.name.replace(/[()]/g, " ").trim();
  const base = [
    `${name} Goa price`,
    `${name} Goa package price`,
    `${target.category.replace(/-/g, " ")} Goa price`,
  ];
  if (/scuba/i.test(name) || target.category.includes("scuba")) {
    base.push(
      "scuba diving in Goa price",
      "Grand Island scuba diving package price",
      "scuba diving Goa with pickup price",
    );
  }
  if (/water.?sport|parasail|jet.?ski/i.test(name) || target.category.includes("water")) {
    base.push("Goa water sports combo price", "Goa parasailing price");
  }
  if (/dudhsagar/i.test(name)) base.push("Dudhsagar waterfall trip price");
  if (/north.?goa/i.test(name)) base.push("North Goa sightseeing package price");
  if (/south.?goa/i.test(name)) base.push("South Goa sightseeing package price");
  if (/dolphin/i.test(name)) base.push("dolphin trip Goa price");
  if (/bungee/i.test(name)) base.push("bungee jumping Goa price");
  if (/flyboard/i.test(name)) base.push("flyboarding Goa price");
  return [...new Set(base)].slice(0, 5);
}
