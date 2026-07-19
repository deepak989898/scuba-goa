import Link from "next/link";
import type { ServiceItem } from "@/data/services";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { ServiceMetaBlock } from "@/components/ServiceMetaBlock";
import { ServiceCardAddToCart } from "@/components/cart/ServiceCardAddToCart";

export function RelatedServicesSidebar({
  services,
}: {
  services: ServiceItem[];
}) {
  if (services.length === 0) return null;

  return (
    <aside aria-labelledby="related-services-title" className="min-w-0">
      <div className="lg:sticky lg:top-20">
        <div className="mb-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
            Explore more Goa
          </p>
          <h2
            id="related-services-title"
            className="mt-0.5 font-display text-xl font-bold text-ocean-900"
          >
            Related services
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-ocean-700">
            Compare another experience or add it to your booking.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {services.map((service) => (
            <article
              key={service.slug}
              className="u-depth-card group overflow-hidden rounded-2xl border border-ocean-100 bg-sand"
            >
              <Link
                href={`/services/${service.slug}`}
                className="relative block aspect-[16/9] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ocean-500"
                aria-label={`View ${service.title}`}
              >
                <CmsRemoteImage
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 352px"
                  loading="lazy"
                />
                {service.mostBooked ? (
                  <span className="absolute left-3 top-3 rounded-full bg-ocean-800 px-2.5 py-1 text-xs font-bold text-white shadow">
                    Most Booked
                  </span>
                ) : null}
                {service.limitedSlots ? (
                  <span className="absolute right-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow">
                    Limited Slots
                  </span>
                ) : null}
              </Link>

              <div className="p-4">
                <Link
                  href={`/services/${service.slug}`}
                  className="font-display text-lg font-bold leading-snug text-ocean-900 transition hover:text-cyan-700"
                >
                  {service.title}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ocean-700">
                  {service.short}
                </p>
                <ServiceMetaBlock s={service} variant="cardGrid" />

                <div className="mt-3 flex items-end justify-between gap-3 rounded-xl border border-ocean-200 bg-white px-3 py-2.5">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-ocean-700">
                      Starting at
                    </p>
                    <p className="font-display text-xl font-extrabold tabular-nums text-ocean-950">
                      ₹{service.priceFrom.toLocaleString("en-IN")}
                      <span className="text-base text-cyan-700">+</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ServiceCardAddToCart service={service} size="sm" />
                  <Link
                    href={`/services/${service.slug}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-extrabold text-slate-950 shadow-md transition hover:bg-cyan-400"
                  >
                    See &amp; book
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <Link
          href="/services"
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full border-2 border-ocean-700 px-5 py-2.5 text-sm font-bold text-ocean-800 transition hover:bg-ocean-50"
        >
          View all services
        </Link>
      </div>
    </aside>
  );
}
