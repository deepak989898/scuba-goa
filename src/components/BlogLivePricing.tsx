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
      className="mt-5"
      aria-labelledby="live-pricing-heading"
      data-seo="live-pricing"
    >
      <details className="group overflow-hidden rounded-lg border border-cyan-200 bg-cyan-50/50 shadow-sm open:border-cyan-400 open:shadow-md">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 marker:hidden transition hover:bg-cyan-50 sm:p-3.5">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">
              Current official rates
            </p>
            <h2
              id="live-pricing-heading"
              className="mt-0.5 font-display text-base font-extrabold sm:text-lg"
            >
              <span className="text-cyan-800">Live prices</span>
              <span className="text-ocean-600"> — </span>
              <span className="text-amber-700">Book Scuba Goa</span>
            </h2>
            <p className="mt-1 text-xs text-ocean-700 sm:text-sm">
              Click to view services, packages and today&apos;s starting prices.
            </p>
          </div>
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-cyan-800 shadow-sm transition group-open:rotate-180 group-open:bg-cyan-100"
          >
            ⌄
          </span>
        </summary>

        <div className="border-t border-cyan-200 px-3 pb-4 sm:px-5 sm:pb-5">
          <p className="mt-3 text-sm text-ocean-700">
            Official rates from our booking system (INR ₹). Confirm slots and pay
            securely on{" "}
            <Link
              href="/booking"
              className="font-bold text-cyan-800 underline decoration-cyan-300 underline-offset-2"
            >
              /booking
            </Link>
            .
          </p>

          {services.length > 0 ? (
            <div className="mt-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-cyan-800">
                Services &amp; activities
              </h3>
              <ul className="mt-1.5 divide-y divide-ocean-100 rounded-lg border border-ocean-100 bg-white">
                {services.slice(0, 8).map((s) => (
                  <li
                    key={s.slug}
                    className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <Link
                      href={`/services/${s.slug}`}
                      className="font-semibold text-ocean-900 hover:text-cyan-700 hover:underline"
                    >
                      {s.title}
                    </Link>
                    <span className="font-mono font-semibold text-emerald-800">
                      from ₹{s.priceFrom.toLocaleString("en-IN")}
                    </span>
                    <span className="w-full text-xs text-ocean-500">{s.duration}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {packages.length > 0 ? (
            <div className="mt-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-amber-700">
                Packages
              </h3>
              <ul className="mt-1.5 divide-y divide-ocean-100 rounded-lg border border-ocean-100 bg-white">
                {packages.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-ocean-900">{p.name}</span>
                    <span className="font-mono font-semibold text-emerald-800">
                      ₹{p.price.toLocaleString("en-IN")}
                    </span>
                    <span className="w-full text-xs text-ocean-500">{p.duration}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}
