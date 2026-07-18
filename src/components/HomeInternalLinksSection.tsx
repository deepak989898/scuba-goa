import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import { getAllServicesServer } from "@/lib/get-services-server";

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

const LINKS = [
  {
    href: "/services/scuba-diving",
    slug: "scuba-diving",
    title: "Scuba diving in Goa",
    blurb: "Try dives, packages, gear & instructor — live starting prices.",
    fallbackImage: u("photo-1544551763-46a013bb70d5"),
    imageAlt: "Scuba diving underwater in Goa",
  },
  {
    href: "/services/dudhsagar-trip",
    slug: "dudhsagar-trip",
    title: "Dudhsagar trip",
    blurb: "Jeep safari day trip with guide options and slot planning.",
    fallbackImage: u("photo-1432405972618-c60b0225b8f9"),
    imageAlt: "Dudhsagar waterfall trip in Goa",
  },
  {
    href: "/services/water-sports",
    slug: "water-sports",
    title: "Water sports in Goa",
    blurb: "Jet ski, parasailing and beach activity combos.",
    fallbackImage: u("photo-1530549387789-4c1017266635"),
    imageAlt: "Water sports on a Goa beach",
  },
  {
    href: "/guides",
    slug: null,
    title: "Travel guides",
    blurb: "Practical guides before you pay — safety, prices, itineraries.",
    fallbackImage: u("photo-1488646953014-85cb44e25828"),
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
      className="bg-sand/50 py-10 sm:py-14"
      aria-labelledby="home-internal-links-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-amber-700">
          Plan your Goa day
        </p>
        <h2
          id="home-internal-links-heading"
          className="mt-1 font-display text-2xl font-bold text-ocean-900 sm:text-3xl"
        >
          Popular experiences & guides
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ocean-700 sm:text-base">
          Jump straight to scuba diving, Dudhsagar, water sports, or our guides —
          then confirm your date on booking.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LINKS.map((item) => {
            const fromCatalog =
              item.slug != null ? bySlug.get(item.slug)?.image?.trim() : "";
            const imageSrc = fromCatalog || item.fallbackImage;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ocean-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-ocean-100">
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
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-display text-lg font-bold text-ocean-900 transition group-hover:text-cyan-800">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ocean-700">
                      {item.blurb}
                    </p>
                    <span className="mt-3 text-sm font-bold text-amber-700">
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
