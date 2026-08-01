import Link from "next/link";
import type { ServiceItem } from "@/data/services";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { ServiceMetaBlock } from "@/components/ServiceMetaBlock";
import { ServiceCardAddToCart } from "@/components/cart/ServiceCardAddToCart";

export function RelatedServicesSidebar({
  services,
  compact = false,
  showScarcity = true,
}: {
  services: ServiceItem[];
  compact?: boolean;
  /** When false, hide “Most Booked / Limited Slots / booked today” style claims. */
  showScarcity?: boolean;
}) {
  if (services.length === 0) return null;

  return (
    <div aria-labelledby="related-services-title" className="min-w-0">
      <div className={compact ? "mb-2" : "mb-3"}>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
          Explore more Goa
        </p>
        <h2
          id="related-services-title"
          className={`font-display font-bold text-ocean-900 ${
            compact ? "mt-0.5 text-lg" : "mt-0.5 text-xl"
          }`}
        >
          Related services
        </h2>
        {!compact ? (
          <p className="mt-0.5 text-sm leading-relaxed text-ocean-700">
            Compare another experience or add it to your booking.
          </p>
        ) : null}
      </div>

      <div className={`grid sm:grid-cols-2 lg:grid-cols-1 ${compact ? "gap-2.5" : "gap-4"}`}>
        {services.map((service) => (
          <article
            key={service.slug}
            className="u-depth-card group overflow-hidden rounded-xl border border-ocean-100 bg-sand"
          >
            <Link
              href={`/services/${service.slug}`}
              className={`relative block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ocean-500 ${
                compact ? "aspect-[16/8]" : "aspect-[16/9]"
              }`}
              aria-label={`View ${service.title}`}
            >
              <CmsRemoteImage
                src={service.image}
                alt={service.title}
                fill
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 340px"
                loading="lazy"
              />
              {showScarcity && service.mostBooked ? (
                <span className="absolute left-2 top-2 rounded-full bg-ocean-800 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  Most Booked
                </span>
              ) : null}
              {showScarcity && service.limitedSlots ? (
                <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  Limited Slots
                </span>
              ) : null}
            </Link>

            <div className={compact ? "p-2.5" : "p-4"}>
              <Link
                href={`/services/${service.slug}`}
                className={`font-display font-bold leading-snug text-ocean-900 transition hover:text-cyan-700 ${
                  compact ? "text-base" : "text-lg"
                }`}
              >
                {service.title}
              </Link>
              <p
                className={`line-clamp-2 text-ocean-700 ${
                  compact ? "mt-0.5 text-xs leading-snug" : "mt-1 text-sm leading-relaxed"
                }`}
              >
                {service.short}
              </p>
              <ServiceMetaBlock
                s={service}
                variant="cardGrid"
                showScarcity={showScarcity}
              />

              <div
                className={`flex items-end justify-between gap-2 rounded-lg border border-ocean-200 bg-white ${
                  compact ? "mt-2 px-2.5 py-1.5" : "mt-3 px-3 py-2.5"
                }`}
              >
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-ocean-700">
                    Starting at
                  </p>
                  <p
                    className={`font-display font-extrabold tabular-nums text-ocean-950 ${
                      compact ? "text-lg" : "text-xl"
                    }`}
                  >
                    ₹{service.priceFrom.toLocaleString("en-IN")}
                    <span className="text-sm text-cyan-700">+</span>
                  </p>
                </div>
              </div>

              <div className={`flex flex-wrap gap-1.5 ${compact ? "mt-2" : "mt-4 gap-2"}`}>
                <ServiceCardAddToCart service={service} size="sm" />
                <Link
                  href={`/services/${service.slug}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-full bg-cyan-500 px-3.5 py-1.5 text-sm font-extrabold text-slate-950 shadow-md transition hover:bg-cyan-400"
                >
                  Book Now
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Link
        href="/services"
        className={`inline-flex w-full items-center justify-center rounded-full border-2 border-ocean-700 px-4 text-sm font-bold text-ocean-800 transition hover:bg-ocean-50 ${
          compact ? "mt-3 min-h-10 py-2" : "mt-5 min-h-11 py-2.5"
        }`}
      >
        View all services
      </Link>
    </div>
  );
}
