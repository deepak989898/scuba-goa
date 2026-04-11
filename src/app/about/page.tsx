import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  OFFICE_ADDRESS_LINES,
  OFFICE_ADDRESS_SINGLELINE,
  SITE_NAME,
  SITE_URL,
  whatsappLink,
} from "@/lib/constants";
import { ADVANCE_BOOKING_INR } from "@/lib/payment";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=75";

const waMessage =
  "Hi, I read your About page. I want to know more about scuba in Goa and booking.";

export const metadata: Metadata = {
  title: "About Us",
  description: `${SITE_NAME} — certified scuba partners in North Goa, clear pricing, Razorpay checkout, and WhatsApp support from a real Baga office.`,
  openGraph: {
    title: `About ${SITE_NAME} | Scuba in Goa you can verify`,
    description:
      "Who we are, how we work with vetted dive teams, and how you book with confidence.",
    url: `${SITE_URL.replace(/\/$/, "")}/about`,
  },
};

export default function AboutPage() {
  const site = SITE_URL.replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: SITE_NAME,
    description:
      "Scuba diving and experiences in North Goa with online booking, Razorpay payments, and WhatsApp support.",
    url: `${site}/`,
    address: {
      "@type": "PostalAddress",
      streetAddress: OFFICE_ADDRESS_LINES[0],
      addressLocality: "Baga, Calangute",
      addressRegion: "Goa",
      postalCode: "403516",
      addressCountry: "IN",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="bg-gradient-to-b from-ocean-50 via-white to-ocean-50/40">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ocean-600 sm:text-sm">
                About us
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ocean-900 sm:text-4xl lg:text-[2.35rem] lg:leading-tight">
                Real dives, clear prices, and a team you can reach on WhatsApp
              </h1>
              <p className="mt-4 text-base leading-relaxed text-ocean-800 sm:text-lg">
                {SITE_NAME} works with trusted scuba and boat partners in North Goa. We
                focus on what travellers actually need: honest briefings, sensible pickup
                windows, secure online payment, and a booking reference you can show on
                the day—without haggling on the beach.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/booking"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-ocean-gradient px-8 py-3 text-sm font-bold text-white shadow-lg shadow-ocean-900/20 transition hover:brightness-110"
                >
                  Book now
                </Link>
                <a
                  href={whatsappLink(waMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-ocean-300 bg-white px-8 py-3 text-sm font-semibold text-ocean-800 transition hover:border-ocean-400 hover:bg-ocean-50"
                >
                  WhatsApp us
                </a>
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-ocean-100 shadow-depth u-depth-card lg:aspect-[5/4]">
              <Image
                src={HERO_IMAGE}
                alt="Scuba divers underwater in clear blue water"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ocean-950/50 via-transparent to-transparent" />
              <p className="absolute bottom-4 left-4 right-4 text-sm font-medium text-white drop-shadow-md">
                Small groups, certified crew, and photos you will actually want to share.
              </p>
            </div>
          </div>

          <ul className="mt-14 grid gap-4 sm:mt-16 sm:grid-cols-3 sm:gap-6">
            <li className="rounded-2xl border border-ocean-100 bg-white p-5 shadow-sm sm:p-6">
              <p className="font-display text-lg font-semibold text-ocean-900">
                Safety first
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ocean-700">
                Briefings, ratios, and boats run to a standard we are happy to explain
                before you pay—not vague promises on the sand.
              </p>
            </li>
            <li className="rounded-2xl border border-ocean-100 bg-white p-5 shadow-sm sm:p-6">
              <p className="font-display text-lg font-semibold text-ocean-900">
                Pay with confidence
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ocean-700">
                Checkout uses Razorpay (UPI, cards, netbanking). Lock your slot with a
                small advance (from ₹{ADVANCE_BOOKING_INR.toLocaleString("en-IN")} per
                person on the booking page)—balance as agreed for your package.
              </p>
            </li>
            <li className="rounded-2xl border border-ocean-100 bg-white p-5 shadow-sm sm:p-6">
              <p className="font-display text-lg font-semibold text-ocean-900">
                Humans, not bots
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ocean-700">
                After payment you get clear next steps on WhatsApp: reporting time, what
                to bring, and who to ping if plans shift.
              </p>
            </li>
          </ul>

          <section
            className="mt-14 rounded-2xl border border-ocean-100 bg-ocean-50/50 p-6 sm:mt-16 sm:p-8"
            aria-labelledby="about-promise-heading"
          >
            <h2
              id="about-promise-heading"
              className="font-display text-xl font-bold text-ocean-900 sm:text-2xl"
            >
              What you can expect from us
            </h2>
            <ul className="mt-5 space-y-3 text-ocean-800 sm:columns-2 sm:gap-x-8 sm:gap-y-3">
              <li className="break-inside-avoid sm:pr-2">
                <span className="font-semibold text-ocean-900">Small groups</span> for
                try-dives and water sports where it matters for comfort and supervision.
              </li>
              <li className="break-inside-avoid sm:pr-2">
                <span className="font-semibold text-ocean-900">Live packages</span> on the
                site so you see what exists today—not yesterday&apos;s flyer price.
              </li>
              <li className="break-inside-avoid sm:pr-2">
                <span className="font-semibold text-ocean-900">Razorpay-backed checkout</span>{" "}
                for domestic cards, UPI, and netbanking with an instant reference.
              </li>
              <li className="break-inside-avoid sm:pr-2">
                <span className="font-semibold text-ocean-900">Refund rules</span> published
                on the site so surprises are rare—read them anytime before you book.
              </li>
              <li className="break-inside-avoid sm:pr-2">
                <span className="font-semibold text-ocean-900">North Goa logistics</span> we
                help coordinate: pickup zones, timing, and realistic meeting points.
              </li>
              <li className="break-inside-avoid sm:pr-2">
                <span className="font-semibold text-ocean-900">10,000+ guests</span> have
                booked through this flow—first-timers and repeat visitors alike.
              </li>
            </ul>
          </section>

          <section
            className="mt-14 overflow-hidden rounded-2xl bg-ocean-900 px-6 py-10 text-white sm:mt-16 sm:px-10 sm:py-12"
            aria-labelledby="about-office-heading"
          >
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="about-office-heading"
                className="font-display text-2xl font-bold sm:text-3xl"
              >
                Visit us in Baga
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-cyan-100/95 sm:text-base">
                We keep a real desk where you can ask questions face-to-face—not just a
                website form. Same team that answers WhatsApp.
              </p>
              <address className="mt-4 text-sm not-italic text-white/90 sm:text-base">
                {OFFICE_ADDRESS_LINES.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/contact"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-400 px-6 py-2.5 text-sm font-bold text-ocean-950 transition hover:bg-cyan-300"
                >
                  Map &amp; contact details
                </Link>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_ADDRESS_SINGLELINE)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/40 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  Open in Google Maps
                </a>
              </div>
            </div>
          </section>

          <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-ocean-600 sm:mt-14">
            Ready to pick a date?{" "}
            <Link href="/services" className="font-semibold text-ocean-700 underline-offset-2 hover:underline">
              Browse services
            </Link>{" "}
            or{" "}
            <Link href="/booking" className="font-semibold text-ocean-700 underline-offset-2 hover:underline">
              go straight to booking
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
