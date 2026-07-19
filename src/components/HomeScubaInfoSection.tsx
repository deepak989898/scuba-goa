"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Long-form SEO copy block. Reads in full on tablet & desktop, but collapses
 * to the first paragraph on phones so the homepage feels short and scannable.
 * A "More details" button reveals the rest in-place — no navigation, no
 * layout shift outside of the section — and toggles back to "Show less".
 */
export function HomeScubaInfoSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="bg-sand/40 py-6 sm:py-8" id="scuba-info">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-xl font-bold text-ocean-900 sm:text-2xl">
          Scuba diving in Goa — what to know
        </h2>

        {/*
          Intro paragraph (≈ 5–6 mobile lines). Always visible on every
          breakpoint so the section never feels empty before expansion.
        */}
        <p className="mt-3 text-sm leading-relaxed text-ocean-800 sm:text-base">
          Scuba diving in Goa is one of the easiest ways for beginners and families to
          experience the underwater side of the Arabian Sea. You do not need to be an
          expert swimmer to try an introductory dive with a certified instructor.
          Before entering the water, the team explains basic hand signals, equalizing
          techniques, and how to breathe calmly through the regulator. Once you are
          comfortable, you move to controlled water depth with one-on-one or
          small-group supervision depending on the package.
        </p>

        {/*
          Everything below the intro is hidden on phones until the toggle is
          pressed. On `sm:` and up we always render it so desktop layouts stay
          unchanged.
        */}
        <div
          id="scuba-info-more"
          className={`${expanded ? "block" : "hidden"} sm:block`}
          aria-hidden={expanded ? undefined : true}
        >
          <p className="mt-2 text-sm leading-relaxed text-ocean-800 sm:text-base">
            Goa dive trips are popular because they combine a short boat journey,
            guided underwater time, and a complete end-to-end setup that includes
            equipment and briefing support. For first-time travelers, the biggest
            advantage is convenience: pickup coordination, scheduled slots, and
            transparent booking details help avoid confusion at crowded beach points.
            Most guests choose morning sessions for better sea comfort and smoother
            activity flow. With proper planning, your dive day can be relaxed, safe,
            and memorable without feeling rushed.
          </p>

          <h3 className="mt-5 font-display text-lg font-semibold text-ocean-900">
            What You Will Experience
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ocean-800 sm:text-base">
            <li>
              <strong>Diving details:</strong> Basic training on breathing, mask
              clearing, and communication signals before guided underwater exploration.
            </li>
            <li>
              <strong>Boat ride:</strong> A scenic ride to the activity point with crew
              support and safety instructions during transit.
            </li>
            <li>
              <strong>Safety:</strong> Step-by-step supervision, controlled depth, and
              professional support throughout the session.
            </li>
          </ul>

          <h3 className="mt-5 font-display text-lg font-semibold text-ocean-900">
            Why Choose Us
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ocean-800 sm:text-base">
            <li>
              <strong>Experience:</strong> We coordinate high-demand Goa activities
              daily with clear communication and reliable slot planning.
            </li>
            <li>
              <strong>Certified instructors:</strong> Trained professionals guide
              guests with beginner-friendly explanations and safe pacing.
            </li>
          </ul>

          <h3 className="mt-5 font-display text-lg font-semibold text-ocean-900">
            Safety Measures
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ocean-800 sm:text-base">
            <li>
              <strong>Equipment:</strong> Verified diving gear, life jackets for boat
              movement, and routine pre-dive checks before entry.
            </li>
            <li>
              <strong>Training:</strong> Mandatory briefing, controlled descent, and
              guided support designed for first-time participants.
            </li>
          </ul>
        </div>

        {/*
          Toggle button is mobile-only (`sm:hidden`). 44 px tap target with
          clear pill styling so it never looks like body text.
        */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="scuba-info-more"
          className="mt-5 inline-flex min-h-11 touch-manipulation items-center justify-center rounded-full border border-ocean-200 bg-white px-4 py-3 text-sm font-semibold text-ocean-800 shadow-sm transition active:bg-ocean-50 sm:hidden"
        >
          {expanded ? "Show less" : "More details"}
          <span aria-hidden className="ml-2 text-base leading-none">
            {expanded ? "▲" : "▼"}
          </span>
        </button>

        <p className="mt-5 text-sm text-ocean-700">
          Ready to book?{" "}
          <Link href="/services/scuba-diving" className="font-semibold text-cyan-800 underline">
            Scuba diving packages
          </Link>
          {" · "}
          <Link href="/services/dudhsagar-trip" className="font-semibold text-cyan-800 underline">
            Dudhsagar trip
          </Link>
          {" · "}
          <Link href="/services/water-sports" className="font-semibold text-cyan-800 underline">
            Water sports
          </Link>
          {" · "}
          <Link href="/booking" className="font-semibold text-ocean-800 underline">
            Book online
          </Link>
          {" · "}
          <Link href="/guides" className="font-semibold text-ocean-800 underline">
            Guides
          </Link>
          {" · "}
          <Link href="/blog/scuba-diving-price-guide-2026" className="font-semibold text-ocean-800 underline">
            2026 price guide
          </Link>
        </p>
      </div>
    </section>
  );
}
