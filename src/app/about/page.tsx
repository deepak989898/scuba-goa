import type { Metadata } from "next";
import Link from "next/link";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";
import {
  CONTACT_PHONE_HREF,
  CONTACT_PHONE_LABEL,
  OFFICE_ADDRESS_LINES,
  OFFICE_ADDRESS_SINGLELINE,
  SITE_NAME,
  SITE_URL,
  whatsappLink,
} from "@/lib/constants";
import {
  aboutPublicImages,
  getAboutContentServer,
} from "@/lib/about-content";
import { ADVANCE_BOOKING_INR } from "@/lib/payment";

const waMessage =
  "Hi, I read your About page. I want to know more about scuba in Goa and booking.";

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_ADDRESS_SINGLELINE)}`;

export const metadata: Metadata = {
  title: "About Us",
  description: `${SITE_NAME} — certified scuba partners in North Goa, clear pricing, Razorpay checkout, and WhatsApp support from a real Baga office.`,
  alternates: {
    canonical: `${SITE_URL.replace(/\/$/, "")}/about`,
  },
  openGraph: {
    title: `About ${SITE_NAME} | Scuba in Goa you can verify`,
    description:
      "Who we are, how we work with vetted dive teams, and how you book with confidence.",
    url: `${SITE_URL.replace(/\/$/, "")}/about`,
  },
};

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l7 3v5c0 4.5-2.8 8.4-7 10-4.2-1.6-7-5.5-7-10V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconPeople({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3 19c0-2.8 2.7-5 6-5s6 2.2 6 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M14.5 14.2c1.1-.7 2.5-1.1 4-1.1 2.5 0 4.5 1.4 4.5 3.4V19"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 18.4l.9-5.4L4.2 9.2l5.4-.8L12 3.5z" />
    </svg>
  );
}

function IconPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-5.4 7-11a7 7 0 10-14 0c0 5.6 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3h3.2l1.2 4.2-2 1.4a12.5 12.5 0 006 6l1.4-2 4.2 1.2V17a2 2 0 01-2.2 2A15.8 15.8 0 015 5.2 2 2 0 017 3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMask({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <ellipse cx="12" cy="11" rx="8" ry="5.5" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="9" cy="11" r="1.5" fill="currentColor" />
      <circle cx="15" cy="11" r="1.5" fill="currentColor" />
      <path d="M8 16.5c1.2 1.2 2.6 1.8 4 1.8s2.8-.6 4-1.8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

const FEATURES = [
  {
    title: "Safety First",
    body: "Certified briefings, sensible ratios, and boats we are happy to explain before you pay.",
    Icon: IconShield,
  },
  {
    title: "Pay With Confidence",
    body: `Razorpay checkout (UPI / card). Lock slots with a small advance from ₹${ADVANCE_BOOKING_INR.toLocaleString("en-IN")}.`,
    Icon: IconCard,
  },
  {
    title: "Humans, Not Bots",
    body: "WhatsApp confirmation with reporting time, what to bring, and a real person if plans shift.",
    Icon: IconPeople,
  },
  {
    title: "10,000+ Happy Divers",
    body: "First-timers and repeat guests book this same clear flow every season.",
    Icon: IconStar,
  },
] as const;

const EXPECT = [
  {
    title: "Small Groups",
    body: "Try-dives and water sports sized for comfort and supervision.",
  },
  {
    title: "Live Packages",
    body: "See what exists today on the site—not yesterday’s flyer price.",
  },
  {
    title: "Refund Rules",
    body: "Published on the site so surprises stay rare before you book.",
  },
  {
    title: "North Goa Logistics",
    body: "Pickup zones, timing, and realistic meeting points we help coordinate.",
  },
  {
    title: "10,000+ Guests",
    body: "Have booked through this flow—beginners and return visitors alike.",
  },
] as const;

const STATS = [
  { label: "10,000+ Happy Divers", Icon: IconPeople },
  { label: "4.9 / 5 Google Rating", Icon: IconStar },
  { label: "50+ Daily Experiences", Icon: IconMask },
  { label: "100% Safety Commitment", Icon: IconShield },
] as const;

export default async function AboutPage() {
  const aboutImages = aboutPublicImages(await getAboutContentServer());
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

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ocean-950">
        <div className="absolute inset-0">
          <CmsRemoteImage
            src={aboutImages.hero}
            alt="Scuba diver underwater with OK hand signal"
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ocean-950/90 via-ocean-950/65 to-ocean-900/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-ocean-950/80 via-transparent to-ocean-950/20" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 sm:pb-28 sm:pt-12 lg:px-8 lg:pb-32">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
            About us
          </p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
            Real Dives.{" "}
            <span className="text-cyan-300">Clear Prices.</span>{" "}
            A Team You Can Trust.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
            We are local dive professionals in North Goa—honest briefings, secure Razorpay
            checkout, and WhatsApp support from a real Baga office.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <Link
              href="/booking"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-400 px-7 py-2.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-300"
            >
              Reserve Your Dive Today
            </Link>
            <a
              href={whatsappLink(waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-white/50 bg-white/10 px-7 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Feature strip overlapping hero */}
      <section className="relative z-10 -mt-14 px-4 sm:-mt-16 sm:px-6 lg:px-8" aria-label="Why book with us">
        <div className="mx-auto grid max-w-7xl gap-3 rounded-2xl border border-ocean-100 bg-white p-4 shadow-depth sm:grid-cols-2 sm:gap-4 sm:p-5 lg:grid-cols-4">
          {FEATURES.map(({ title, body, Icon }) => (
            <div key={title} className="flex gap-3 sm:block sm:text-center lg:text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 sm:mx-auto lg:mx-0">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="mt-0 font-display text-sm font-bold text-ocean-900 sm:mt-2">
                  {title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-ocean-700 sm:text-sm">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mid: expect | image | visit */}
      <section className="bg-white px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_minmax(0,18rem)_1fr] lg:items-start lg:gap-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
              What you can expect
            </p>
            <ul className="mt-4 space-y-3.5">
              {EXPECT.map((item, i) => (
                <li key={item.title} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ocean-800 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-display text-sm font-bold text-ocean-900 sm:text-base">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ocean-700">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-2xl border border-ocean-100 shadow-md lg:max-w-none">
            <CmsRemoteImage
              src={aboutImages.mid}
              alt="Tropical Goa coastline and turquoise water"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 80vw, 288px"
            />
          </div>

          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
              Visit us in Baga
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-ocean-900 sm:text-2xl">
              A real desk, not just a form
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ocean-700">
              Ask questions face-to-face—same team that answers WhatsApp after you book.
            </p>

            <ul className="mt-4 space-y-2.5">
              <li className="flex gap-3 rounded-xl border border-ocean-100 bg-ocean-50/60 p-3">
                <IconPin className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ocean-600">
                    Office address
                  </p>
                  <address className="mt-0.5 text-sm not-italic leading-snug text-ocean-900">
                    {OFFICE_ADDRESS_LINES.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                </div>
              </li>
              <li className="flex gap-3 rounded-xl border border-ocean-100 bg-ocean-50/60 p-3">
                <IconClock className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ocean-600">
                    Opening hours
                  </p>
                  <p className="mt-0.5 text-sm text-ocean-900">
                    Daily 8:00 AM – 8:00 PM (IST)
                  </p>
                </div>
              </li>
              <li className="flex gap-3 rounded-xl border border-ocean-100 bg-ocean-50/60 p-3">
                <IconPhone className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ocean-600">
                    Contact
                  </p>
                  <a
                    href={CONTACT_PHONE_HREF}
                    className="mt-0.5 block text-sm font-semibold text-ocean-900 hover:text-cyan-800"
                  >
                    {CONTACT_PHONE_LABEL}
                  </a>
                </div>
              </li>
            </ul>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                href="/contact"
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-ocean-800 px-5 py-2 text-sm font-bold text-white transition hover:bg-ocean-700"
              >
                Map &amp; Contact Details
              </Link>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center justify-center rounded-full border-2 border-ocean-300 bg-white px-5 py-2 text-sm font-semibold text-ocean-800 transition hover:border-ocean-400"
              >
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section
        className="border-t border-ocean-100 bg-sand/60 px-4 py-6 sm:px-6 sm:py-7 lg:px-8"
        aria-label="Book Scuba Goa highlights"
      >
        <ul className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STATS.map(({ label, Icon }) => (
            <li key={label} className="flex flex-col items-center text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-cyan-700 shadow-sm ring-1 ring-ocean-100">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-2 font-display text-sm font-bold text-ocean-900 sm:text-base">
                {label}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
