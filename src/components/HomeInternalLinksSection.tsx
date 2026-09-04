import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { cmsImageOrPlaceholder, pickCmsImage } from "@/lib/cms-image";
import { getAllServicesServer } from "@/lib/get-services-server";

const LINKS = [
  {
    href: "/services/scuba-diving",
    slug: "scuba-diving",
    title: "Scuba diving in Goa",
    blurb: "Try dives, packages, gear & instructor — live starting prices.",
    imageAlt: "Scuba diving underwater in Goa",
  },
  {
    href: "/services/dudhsagar-trip",
    slug: "dudhsagar-trip",
    title: "Dudhsagar trip",
    blurb: "Jeep safari day trip with guide options and slot planning.",
    imageAlt: "Dudhsagar waterfall trip in Goa",
  },
  {
    href: "/services/water-sports",
    slug: "water-sports",
    title: "Water sports in Goa",
    blurb: "Jet ski, parasailing and beach activity combos.",
    imageAlt: "Water sports on a Goa beach",
  },
  {
    href: "/guides",
    slug: null,
    title: "Travel guides",
    blurb: "Practical guides before you pay — safety, prices, itineraries.",
    imageAlt: "Travel guides for planning a Goa trip",
  },
] as const;

/** Homepage internal links for SEO crawl paths + guest navigation. */
export async function HomeInternalLinksSection() {
  const services = await getAllServicesServer();
  const bySlug = new Map(services.map((s) => [s.slug, s]));

  return (
    <section
      id="explore-goa"
      className="bg-sand/50 py-4 sm:py-5"
      aria-labelledby="home-internal-links-heading"
    >
      <div className="site-container">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-amber-700">
          Plan your Goa day
        </p>
        <h2
          id="home-internal-links-heading"
          className="mt-0.5 font-display text-xl font-bold text-ocean-900 sm:text-2xl"
        >
          Popular experiences & guides
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-ocean-700">
          Jump straight to scuba diving, Dudhsagar, water sports, or our guides —
          then confirm your date on booking.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LINKS.map((item) => {
            const fromCatalog =
              item.slug != null
                ? pickCmsImage(bySlug.get(item.slug)?.image)
                : "";
            const imageSrc = cmsImageOrPlaceholder(fromCatalog);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ocean-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-ocean-100">
                    <CmsRemoteImage
                      src={imageSrc}
                      alt={item.imageAlt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ocean-950/35 via-transparent to-transparent"
                      aria-hidden
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <h3 className="font-display text-base font-bold text-ocean-900 transition group-hover:text-cyan-800">
                      {item.title}
                    </h3>
                    <p className="mt-1 flex-1 text-xs leading-relaxed text-ocean-700 sm:text-sm">
                      {item.blurb}
                    </p>
                    <span className="mt-2 text-sm font-bold text-amber-700">
                      Open page →
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
