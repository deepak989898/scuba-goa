import Link from "next/link";
import type { ReactNode } from "react";
import {
  detectContentTopic,
  type ContentTopicId,
} from "@/lib/content-topic";

type WhyChooseCopy = {
  intro: ReactNode;
  points: { title: string; body: ReactNode }[];
};

const WHY_CHOOSE_BY_TOPIC: Record<ContentTopicId, WhyChooseCopy> = {
  nightlife: {
    intro: (
      <>
        Goa nightlife has many promoters on the street. Booking through Book Scuba Goa
        gives you confirmed guest-list entry, clear reporting times, and support if plans
        change. Browse{" "}
        <Link href="/services" className="font-semibold text-ocean-700 hover:text-ocean-800">
          nightlife packages
        </Link>{" "}
        or{" "}
        <Link href="/booking" className="font-semibold text-ocean-700 hover:text-ocean-800">
          book online
        </Link>{" "}
        before you head out.
      </>
    ),
    points: [
      {
        title: "Verified venue entry & guest lists",
        body:
          "Pre-booked packages reduce last-minute cover surprises and help you skip unofficial touts selling fake passes.",
      },
      {
        title: "Clear inclusions before you pay",
        body:
          "See what is included—entry, table, drinks, or VIP add-ons—on the service page so you compare packages fairly.",
      },
      {
        title: "WhatsApp support on the night",
        body:
          "Get venue directions, reporting time, and pickup coordination when you book through our team.",
      },
    ],
  },
  casino: {
    intro: (
      <>
        Casino cruises in Goa work on fixed boarding slots and ID checks. Book Scuba Goa
        helps you secure packages with transparent inclusions before you reach the jetty.{" "}
        <Link href="/booking" className="font-semibold text-ocean-700 hover:text-ocean-800">
          Book online
        </Link>{" "}
        or compare{" "}
        <Link href="/services" className="font-semibold text-ocean-700 hover:text-ocean-800">
          casino cruises
        </Link>
        .
      </>
    ),
    points: [
      {
        title: "Licensed operator packages",
        body:
          "We list cruises with clear boarding time, duration, and what is included in your entry package.",
      },
      {
        title: "ID & age requirements upfront",
        body:
          "21+ with original photo ID is mandatory—your booking confirmation reminds you what to carry.",
      },
      {
        title: "Secure online payment",
        body:
          "Pay with Razorpay and receive WhatsApp confirmation with jetty location and reporting instructions.",
      },
    ],
  },
  scuba: {
    intro: (
      <>
        Goa has many operators. The difference is predictable scheduling, verified gear cycles,
        and support when weather shifts. Use this site to{" "}
        <Link href="/booking" className="font-semibold text-ocean-700 hover:text-ocean-800">
          book online
        </Link>{" "}
        with clear meeting times—or browse{" "}
        <Link href="/services" className="font-semibold text-ocean-700 hover:text-ocean-800">
          all services
        </Link>{" "}
        including scuba, tours, and water sports.
      </>
    ),
    points: [
      {
        title: "Certified divers & trained crew",
        body: (
          <>
            Sessions are run with certified instructors and safety-first briefings—gear checks,
            conservative depths for try dives, and clear hand signals before you enter the water.
          </>
        ),
      },
      {
        title: "Free pickup on selected packages",
        body: (
          <>
            Many of our experiences include coordinated hotel pickup so you are not negotiating
            last-minute taxis at crowded beach points. Confirm pickup zones when you{" "}
            <Link href="/booking" className="font-semibold text-ocean-700 hover:text-ocean-800">
              book online
            </Link>
            .
          </>
        ),
      },
      {
        title: "Best price guarantee mindset",
        body: (
          <>
            We focus on transparent inclusions—taxes, media, boat transfer, and time in water—so
            you compare apples to apples. See live package cards on{" "}
            <Link href="/services" className="font-semibold text-ocean-700 hover:text-ocean-800">
              all services
            </Link>{" "}
            before you pay.
          </>
        ),
      },
    ],
  },
  dolphin: {
    intro: (
      <>
        Dolphin trips depend on sea conditions and early-morning slots. Book Scuba Goa helps you
        lock timing, pickup, and boat inclusions in advance.{" "}
        <Link href="/booking" className="font-semibold text-ocean-700 hover:text-ocean-800">
          Book your trip
        </Link>{" "}
        or explore{" "}
        <Link href="/services" className="font-semibold text-ocean-700 hover:text-ocean-800">
          more activities
        </Link>
        .
      </>
    ),
    points: [
      {
        title: "Sunrise slot coordination",
        body:
          "Morning departures offer the best chance to spot dolphins—we confirm reporting time and jetty location after booking.",
      },
      {
        title: "Safety gear included",
        body:
          "Life jackets and a trained crew are standard on listed packages—check your option for duration and extras.",
      },
      {
        title: "Combine with other Goa plans",
        body:
          "Many guests pair a dolphin trip with sightseeing or water sports on separate days—add packages from the services page.",
      },
    ],
  },
  watersports: {
    intro: (
      <>
        Water sports prices and durations vary by beach and season. Book Scuba Goa shows live
        package cards with inclusions so you know what you are paying for before you reach the
        counter.{" "}
        <Link href="/services" className="font-semibold text-ocean-700 hover:text-ocean-800">
          Compare activities
        </Link>{" "}
        or{" "}
        <Link href="/booking" className="font-semibold text-ocean-700 hover:text-ocean-800">
          book online
        </Link>
        .
      </>
    ),
    points: [
      {
        title: "Clear activity inclusions",
        body:
          "Parasailing, jet ski, banana boat, and combo packages list duration and gear on the service page.",
      },
      {
        title: "Trained operators",
        body:
          "Activities run with safety briefings and standard equipment checks before you start.",
      },
      {
        title: "Flexible add-ons",
        body:
          "Build a day plan—mix water sports with tours or nightlife bookings through one checkout flow.",
      },
    ],
  },
  tour: {
    intro: (
      <>
        North and South Goa tours cover many stops in one day. Booking ahead locks your seat,
        pickup window, and guide timing.{" "}
        <Link href="/booking" className="font-semibold text-ocean-700 hover:text-ocean-800">
          Reserve your tour
        </Link>{" "}
        or browse{" "}
        <Link href="/services" className="font-semibold text-ocean-700 hover:text-ocean-800">
          all packages
        </Link>
        .
      </>
    ),
    points: [
      {
        title: "Planned itineraries",
        body:
          "See major sights with a fixed route and timing—less hassle than negotiating with random taxi drivers.",
      },
      {
        title: "Hotel pickup options",
        body:
          "Many tours include pickup from popular beach areas—confirm your zone when you book.",
      },
      {
        title: "Transparent pricing",
        body:
          "Starting prices and inclusions are listed on each tour card before you pay online.",
      },
    ],
  },
  general: {
    intro: (
      <>
        Plan your Goa trip with verified packages, secure payment, and WhatsApp support.{" "}
        <Link href="/booking" className="font-semibold text-ocean-700 hover:text-ocean-800">
          Book online
        </Link>{" "}
        or explore{" "}
        <Link href="/services" className="font-semibold text-ocean-700 hover:text-ocean-800">
          tours, nightlife, water sports & more
        </Link>
        .
      </>
    ),
    points: [
      {
        title: "One place for multiple activities",
        body:
          "Scuba, cruises, nightlife, tours, and water sports—compare packages and add to cart in one flow.",
      },
      {
        title: "Secure Razorpay checkout",
        body:
          "Pay online and receive instant WhatsApp confirmation with timing and meeting details.",
      },
      {
        title: "Local team support",
        body:
          "Message us before or after booking for pickup, reschedules, and package questions.",
      },
    ],
  },
};

export function BlogWhyChooseSection({
  content,
}: {
  /** When set, copy matches the page topic (nightlife, scuba, casino, etc.). */
  content?: { title: string; keywords: string[] };
}) {
  const topic = content ? detectContentTopic(content) : "scuba";
  const copy = WHY_CHOOSE_BY_TOPIC[topic];

  return (
    <section
      className="mt-5 rounded-lg border border-ocean-200 bg-gradient-to-br from-ocean-50 to-white p-3 sm:p-4"
      aria-labelledby="why-choose-heading"
    >
      <h2
        id="why-choose-heading"
        className="font-display text-lg font-bold text-ocean-900 sm:text-xl"
      >
        Why travellers choose us over random beach touts
      </h2>
      <p className="mt-1.5 text-sm leading-snug text-ocean-700">{copy.intro}</p>
      <ul className="mt-3 space-y-2.5">
        {copy.points.map((p) => (
          <li key={p.title}>
            <p className="text-sm font-semibold text-ocean-900">{p.title}</p>
            <div className="mt-0.5 text-sm leading-snug text-ocean-700">
              {p.body}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
