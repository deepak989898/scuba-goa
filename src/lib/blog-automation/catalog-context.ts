import { getAllPackagesServer } from "@/lib/get-packages-server";
import { getAllServicesServer } from "@/lib/get-services-server";
import type { PackageDoc } from "@/lib/types";
import type { ServiceItem } from "@/data/services";

export type BlogCatalogSnapshot = {
  services: ServiceItem[];
  packages: PackageDoc[];
  textBlock: string;
};

function formatServiceLine(s: ServiceItem): string {
  const subs =
    s.subServices
      ?.filter((sub) => sub.priceFrom != null && sub.priceFrom > 0)
      .map((sub) => `    · ${sub.title}: from ₹${sub.priceFrom}`)
      .join("\n") ?? "";
  const base = `- ${s.title} (slug: ${s.slug}) · from ₹${s.priceFrom} · ${s.duration} · includes: ${s.includes.slice(0, 4).join(", ")}`;
  return subs ? `${base}\n${subs}` : base;
}

function formatPackageLine(p: PackageDoc): string {
  const combo =
    p.isCombo && p.discountPct
      ? ` · combo save ~${p.discountPct}%`
      : "";
  const cat = p.category ? ` · ${p.category}` : "";
  return `- ${p.name} (id: ${p.id}) · ₹${p.price} · ${p.duration}${cat}${combo} · includes: ${p.includes.slice(0, 4).join(", ")}`;
}

/** Live catalog text for OpenAI — never invent prices outside this list. */
export async function buildBlogCatalogContext(): Promise<BlogCatalogSnapshot> {
  const [services, packages] = await Promise.all([
    getAllServicesServer(),
    getAllPackagesServer(),
  ]);

  const serviceLines = services
    .filter((s) => s.priceFrom > 0)
    .map(formatServiceLine)
    .join("\n");

  const packageLines = packages
    .filter((p) => p.price > 0)
    .map(formatPackageLine)
    .join("\n");

  const textBlock = `OFFICIAL CATALOG — Book Scuba Goa (use ONLY these prices; never invent amounts):

Services & activities (from ₹ = starting price per person unless noted):
${serviceLines || "(none)"}

Booking packages (exact ₹ prices on /booking):
${packageLines || "(none)"}

Rules:
- When mentioning cost, use exact ₹ figures from this catalog.
- Add a markdown section "## Prices & packages (Book Scuba Goa)" with a clear table or bullet list of relevant items.
- Link readers to /booking for live checkout and /services/{slug} for activity details.
- If comparing options, use at most 3 packages/services from this list.`;

  return { services, packages, textBlock };
}

/** Append authoritative pricing footer to auto-generated markdown. */
export function buildOfficialPricingMarkdown(
  snapshot: BlogCatalogSnapshot,
  focusServiceSlug?: string,
): string {
  const { services, packages } = snapshot;
  const focusService = focusServiceSlug
    ? services.find((s) => s.slug === focusServiceSlug)
    : null;

  const relevantServices = focusService
    ? [focusService, ...services.filter((s) => s.slug !== focusServiceSlug).slice(0, 5)]
    : services.slice(0, 8);

  const relevantPackages = packages.slice(0, 12);

  const serviceRows = relevantServices
    .map((s) => `| ${s.title} | from ₹${s.priceFrom} | ${s.duration} | /services/${s.slug} |`)
    .join("\n");

  const packageRows = relevantPackages
    .map((p) => `| ${p.name} | ₹${p.price} | ${p.duration} | /booking |`)
    .join("\n");

  return `

## Prices & packages (Book Scuba Goa)

Official rates below are from our live booking system. Confirm availability on [Book now](/booking).

### Services & activities

| Activity | Price (from) | Duration | Details |
| --- | --- | --- | --- |
${serviceRows}

### Popular packages

| Package | Price | Duration | Book |
| --- | --- | --- | --- |
${packageRows}

*Prices in INR (₹) per person unless stated. Offers and slot availability may change — always verify on [/booking](/booking) before payment.*
`;
}
