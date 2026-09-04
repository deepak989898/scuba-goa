import Link from "next/link";
import type { ContentSeoEnhancement } from "@/lib/content-seo-enhancements";

type Props = {
  data: ContentSeoEnhancement;
  venueLabel?: string;
};

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * Conversion-focused SEO blocks: intro, quick facts, pricing, drinks, location, booking.
 * Rendered on guide and blog detail pages before the main article body.
 */
export function ContentConversionSection({ data, venueLabel }: Props) {
  const priceHeading = venueLabel
    ? `${venueLabel} Entry Fee 2026`
    : "Entry fee & packages 2026";

  return (
    <div className="mt-4 space-y-5" data-seo="conversion-blocks">
      {/* Intro — answers search intent in first screen */}
      {data.introParagraphs.length > 0 ? (
        <section aria-label="Guide introduction" className="space-y-2.5">
          {data.introParagraphs.map((para, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed text-ocean-800 sm:text-base sm:leading-7"
            >
              {para}
            </p>
          ))}
        </section>
      ) : null}

      {/* Quick Facts */}
      {data.quickFacts.length > 0 ? (
        <section aria-labelledby="quick-facts-heading">
          <h2
            id="quick-facts-heading"
            className="font-display text-lg font-bold text-ocean-900 sm:text-xl"
          >
            {venueLabel ? `${venueLabel} — Quick Facts` : "Quick facts"}
          </h2>
          <div className="mt-2 overflow-hidden rounded-xl border border-ocean-100 shadow-sm">
            <table className="w-full text-left text-sm">
              <tbody>
                {data.quickFacts.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-ocean-50 last:border-0 odd:bg-white even:bg-sand/60"
                  >
                    <th
                      scope="row"
                      className="w-[38%] px-3 py-2.5 font-semibold text-ocean-900 sm:px-4"
                    >
                      {row.icon ? `${row.icon} ` : ""}
                      {row.label}
                    </th>
                    <td className="px-3 py-2.5 text-ocean-800 sm:px-4">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Entry pricing — visible table (not hidden in accordion) */}
      {data.entryPricing.length > 0 ? (
        <section aria-labelledby="entry-fee-heading">
          <h2
            id="entry-fee-heading"
            className="font-display text-lg font-bold text-ocean-900 sm:text-xl"
          >
            {priceHeading}
          </h2>
          <p className="mt-1 text-sm text-ocean-600">
            Official starting prices from Book Scuba Goa — confirm inclusions on
            the booking page before payment.
          </p>
          <div className="mt-2 overflow-x-auto rounded-xl border border-ocean-100 shadow-sm">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="bg-ocean-900 text-white">
                  <th scope="col" className="px-3 py-2.5 font-semibold sm:px-4">
                    Package
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold sm:px-4">
                    Starting price
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold sm:px-4">
                    Usually includes
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.entryPricing.map((row) => (
                  <tr
                    key={row.package}
                    className="border-b border-ocean-50 last:border-0 odd:bg-white even:bg-sand/50"
                  >
                    <td className="px-3 py-2.5 font-medium text-ocean-900 sm:px-4">
                      {row.package}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-bold text-emerald-700 sm:px-4">
                      {formatInr(row.priceFrom)}+
                    </td>
                    <td className="px-3 py-2.5 text-ocean-700 sm:px-4">
                      {row.includes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={data.bookingHref}
              className="inline-flex min-h-9 items-center rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-4 py-1.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
            >
              Check today&apos;s package
            </Link>
            <Link
              href={data.serviceHref}
              className="inline-flex min-h-9 items-center rounded-full border border-ocean-200 bg-white px-4 py-1.5 text-sm font-semibold text-ocean-800 transition hover:bg-ocean-50"
            >
              View service details
            </Link>
          </div>
        </section>
      ) : null}

      {/* Unlimited drinks clarity */}
      {data.drinksInclusions.length > 0 ? (
        <section aria-labelledby="drinks-heading">
          <h2
            id="drinks-heading"
            className="font-display text-lg font-bold text-ocean-900 sm:text-xl"
          >
            What&apos;s included in unlimited drink packages?
          </h2>
          <p className="mt-1 text-sm text-ocean-600">
            &ldquo;Unlimited drinks&rdquo; varies by package — always confirm
            before paying. Typical inclusions vs. items to verify:
          </p>
          <div className="mt-2 overflow-hidden rounded-xl border border-amber-100 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-amber-50 text-ocean-900">
                  <th scope="col" className="px-3 py-2.5 font-semibold sm:px-4">
                    Included / confirm
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold sm:px-4">
                    Not included / verify
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.drinksInclusions.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-amber-50 last:border-0 odd:bg-white even:bg-amber-50/30"
                  >
                    <td className="px-3 py-2.5 text-ocean-800 sm:px-4">
                      {row.included}
                    </td>
                    <td className="px-3 py-2.5 text-ocean-700 sm:px-4">
                      {row.verify}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Location + timings */}
      {data.location ? (
        <section aria-labelledby="location-heading">
          <h2
            id="location-heading"
            className="font-display text-lg font-bold text-ocean-900 sm:text-xl"
          >
            Location &amp; how to reach
          </h2>
          <div className="mt-2 rounded-xl border border-ocean-100 bg-sand/40 p-4">
            <p className="font-semibold text-ocean-900">
              {data.location.venueName}
            </p>
            <p className="mt-1 text-sm text-ocean-800">{data.location.address}</p>
            <p className="mt-2 text-sm text-ocean-700">
              <span className="font-semibold">Nearby areas:</span>{" "}
              {data.location.nearby}
            </p>
            <p className="mt-2 text-sm text-ocean-700">
              <span className="font-semibold">Opening hours:</span> {data.timings}
            </p>
            <a
              href={data.location.mapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-9 items-center rounded-full border border-cyan-300 bg-cyan-50 px-4 py-1.5 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-100"
            >
              Open in Google Maps →
            </a>
          </div>
        </section>
      ) : null}

      {/* Booking block */}
      <section
        aria-labelledby="booking-info-heading"
        className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"
      >
        <h2
          id="booking-info-heading"
          className="font-display text-lg font-bold text-ocean-900"
        >
          How to book
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ocean-800">
          {data.bookingNote}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={data.bookingHref}
            className="inline-flex min-h-10 items-center rounded-full bg-ocean-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-ocean-800"
          >
            Book online now
          </Link>
          <a
            href={data.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center rounded-full border border-emerald-400 bg-white px-5 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50"
          >
            WhatsApp to confirm
          </a>
        </div>
      </section>

      {/* Internal links */}
      {data.internalLinks.length > 0 ? (
        <nav aria-label="Related pages" className="border-t border-ocean-100 pt-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-cyan-700">
            Related pages
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {data.internalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex rounded-full border border-ocean-100 bg-white px-3 py-1 text-sm font-semibold text-ocean-800 transition hover:border-cyan-300 hover:text-cyan-900"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
