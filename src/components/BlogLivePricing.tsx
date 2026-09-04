import Link from "next/link";
import { buildBlogCatalogContext } from "@/lib/blog-automation/catalog-context";
import {
  TOPIC_SERVICE_DEPRIORITIZE,
  TOPIC_SERVICE_PRIORITY,
  detectContentTopic,
} from "@/lib/content-topic";
import type { ServiceItem } from "@/data/services";

type Props = {
  focusServiceSlug?: string;
  topicMeta?: { title: string; keywords: string[] };
};

function rankServicesForTopic(
  services: ServiceItem[],
  topicMeta: { title: string; keywords: string[] },
  focusServiceSlug?: string,
): ServiceItem[] {
  const topic = detectContentTopic(topicMeta);
  const tokens = new Set(
    `${topicMeta.title} ${topicMeta.keywords.join(" ")}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3),
  );
  const priorities = TOPIC_SERVICE_PRIORITY[topic];
  const deprioritize = TOPIC_SERVICE_DEPRIORITIZE[topic];

  return [...services]
    .map((service) => {
      const text = `${service.slug} ${service.title} ${service.short}`.toLowerCase();
      let score = service.slug === focusServiceSlug ? 200 : 0;
      for (const token of tokens) {
        if (text.includes(token)) score += 2;
      }
      const pIdx = priorities.findIndex(
        (s) => service.slug === s || service.slug.includes(s),
      );
      if (pIdx >= 0) score += (priorities.length - pIdx) * 12;
      if (deprioritize?.test(text)) score -= 40;
      return { service, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ service }) => service);
}

function topicPricingLabel(topic: ReturnType<typeof detectContentTopic>): string {
  const map: Record<ReturnType<typeof detectContentTopic>, string> = {
    nightlife: "Nightlife & club packages",
    casino: "Casino cruise packages",
    scuba: "Scuba diving packages",
    watersports: "Water sports & adventure",
    dolphin: "Dolphin & sea trips",
    tour: "Goa tours & sightseeing",
    general: "Services & activities",
  };
  return map[topic];
}

/** Visible official prices for crawlers, AI Overviews, and readers (live Firestore catalog). */
export async function BlogLivePricing({ focusServiceSlug, topicMeta }: Props) {
  const catalog = await buildBlogCatalogContext();
  const meta = topicMeta ?? { title: "", keywords: [] };
  const topic = topicMeta ? detectContentTopic(topicMeta) : "general";

  let services = topicMeta
    ? rankServicesForTopic(catalog.services, meta, focusServiceSlug)
    : catalog.services;

  if (focusServiceSlug) {
    const focus = services.find((s) => s.slug === focusServiceSlug);
    const rest = services.filter((s) => s.slug !== focusServiceSlug);
    services = focus ? [focus, ...rest] : rest;
  }

  services = services.slice(0, 6);
  const packages =
    topic === "scuba" || topic === "general"
      ? catalog.packages.slice(0, 6)
      : catalog.packages
          .filter((p) => {
            const hay = p.name.toLowerCase();
            if (topic === "nightlife") return /night|club|pub|party/.test(hay);
            if (topic === "casino") return /casino|cruise/.test(hay);
            if (topic === "watersports") return /water|sport|fly|bungee/.test(hay);
            if (topic === "dolphin") return /dolphin|island|boat/.test(hay);
            if (topic === "tour") return /tour|goa|dudhsagar/.test(hay);
            return false;
          })
          .slice(0, 4);

  if (services.length === 0 && packages.length === 0) return null;

  const sectionLabel = topicMeta
    ? topicPricingLabel(topic)
    : "Services & activities";

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
              className="mt-0.5 font-display text-base font-extrabold text-cyan-800 sm:text-lg"
            >
              Live prices
            </h2>
            <p className="mt-1 text-xs text-ocean-700 sm:text-sm">
              {sectionLabel} — tap to view starting prices and packages.
            </p>
          </div>
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-200 bg-white text-cyan-800 shadow-sm transition duration-200 group-open:rotate-180 group-open:border-cyan-400 group-open:bg-cyan-100"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
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
                {sectionLabel}
              </h3>
              <ul className="mt-1.5 divide-y divide-ocean-100 rounded-lg border border-ocean-100 bg-white">
                {services.map((s) => (
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
          ) : (
            <p className="mt-3 text-sm text-ocean-700">
              <Link href="/services" className="font-bold text-cyan-800 hover:underline">
                Browse all services
              </Link>{" "}
              for live availability and pricing.
            </p>
          )}

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
