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
      className="mt-14"
      aria-labelledby="live-pricing-heading"
      data-seo="live-pricing"
    >
      <details className="group overflow-hidden rounded-2xl border border-cyan-200 bg-cyan-50/50 shadow-sm open:border-cyan-400 open:shadow-md">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 marker:hidden transition hover:bg-cyan-50 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">
              Current official rates
            </p>
            <h2
              id="live-pricing-heading"
              className="mt-1 font-display text-xl font-extrabold sm:text-2xl"
            >
              <span className="text-cyan-800">Live prices</span>
              <span className="text-ocean-600"> — </span>
              <span className="text-amber-700">Book Scuba Goa</span>
            </h2>
            <p className="mt-1.5 text-sm text-ocean-700">
              Click to view services, packages and today&apos;s starting prices.
            </p>
          </div>
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xl font-bold text-cyan-800 shadow-sm transition group-open:rotate-180 group-open:bg-cyan-100"
          >
            ⌄
          </span>
        </summary>

        <div className="border-t border-cyan-200 px-5 pb-6 sm:px-8 sm:pb-8">
          <p className="mt-5 text-sm text-ocean-700">
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
            <div className="mt-6">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-cyan-800">
                Services &amp; activities
              </h3>
              <ul className="mt-3 divide-y divide-ocean-100 rounded-xl border border-ocean-100 bg-white">
                {services.slice(0, 8).map((s) => (
                  <li
                    key={s.slug}
                    className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm"
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
            <div className="mt-6">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-amber-700">
                Packages
              </h3>
              <ul className="mt-3 divide-y divide-ocean-100 rounded-xl border border-ocean-100 bg-white">
                {packages.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm"
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
