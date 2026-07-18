import Link from "next/link";

const LINKS = [
  {
    href: "/services/scuba-diving",
    title: "Scuba diving in Goa",
    blurb: "Try dives, packages, gear & instructor — live starting prices.",
  },
  {
    href: "/services/dudhsagar-trip",
    title: "Dudhsagar trip",
    blurb: "Jeep safari day trip with guide options and slot planning.",
  },
  {
    href: "/services/water-sports",
    title: "Water sports in Goa",
    blurb: "Jet ski, parasailing and beach activity combos.",
  },
  {
    href: "/guides",
    title: "Travel guides",
    blurb: "Practical guides before you pay — safety, prices, itineraries.",
  },
] as const;

/** Homepage internal links for SEO crawl paths + guest navigation. */
export function HomeInternalLinksSection() {
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
          {LINKS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex h-full flex-col rounded-2xl border border-ocean-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
              >
                <h3 className="font-display text-lg font-bold text-ocean-900 transition group-hover:text-cyan-800">
                  {item.title}
                </h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ocean-700">
                  {item.blurb}
                </p>
                <span className="mt-3 text-sm font-bold text-amber-700">
                  Open page →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
