import Link from "next/link";
import { buildBlogCatalogContext } from "@/lib/blog-automation/catalog-context";
import type { ServiceItem } from "@/data/services";

type Props = {
  focusServiceSlug?: string;
};

/** Visible official prices for crawlers, AI Overviews, and readers (live Firestore catalog). */
export async function BlogLivePricing({ focusServiceSlug }: Props) {
  const catalog = await buildBlogCatalogContext();
  let services: ServiceItem[] = catalog.services;
  if (focusServiceSlug) {
    const focus = catalog.services.find((s) => s.slug === focusServiceSlug);
    const rest = catalog.services.filter((s) => s.slug !== focusServiceSlug);
    services = focus ? [focus, ...rest] : rest;
  }

  const packages = catalog.packages.slice(0, 10);

  if (services.length === 0 && packages.length === 0) return null;

  return (
    <section
      className="mt-14 rounded-2xl border border-ocean-200 bg-ocean-50/60 p-6 sm:p-8"
      aria-labelledby="live-pricing-heading"
      data-seo="live-pricing"
    >
      <h2
        id="live-pricing-heading"
        className="font-display text-xl font-bold text-ocean-900 sm:text-2xl"
      >
        Live prices — Book Scuba Goa
      </h2>
      <p className="mt-2 text-sm text-ocean-700">
        Official rates from our booking system (INR ₹). Confirm slots and pay securely on{" "}
        <Link href="/booking" className="font-semibold text-ocean-800 underline">
          /booking
        </Link>
        .
      </p>

      {services.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-ocean-800">
            Services & activities
          </h3>
          <ul className="mt-3 divide-y divide-ocean-100 rounded-xl border border-ocean-100 bg-white">
            {services.slice(0, 8).map((s) => (
              <li
                key={s.slug}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm"
              >
                <Link
                  href={`/services/${s.slug}`}
                  className="font-semibold text-ocean-900 hover:underline"
                >
                  {s.title}
                </Link>
                <span className="font-mono font-semibold text-ocean-800">
                  from ₹{s.priceFrom.toLocaleString("en-IN")}
                </span>
                <span className="w-full text-xs text-ocean-500">{s.duration}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {packages.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-ocean-800">
            Packages
          </h3>
          <ul className="mt-3 divide-y divide-ocean-100 rounded-xl border border-ocean-100 bg-white">
            {packages.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-ocean-900">{p.name}</span>
                <span className="font-mono font-semibold text-ocean-800">
                  ₹{p.price.toLocaleString("en-IN")}
                </span>
                <span className="w-full text-xs text-ocean-500">{p.duration}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
