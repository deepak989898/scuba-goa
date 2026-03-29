import Link from "next/link";
import type { ReactNode } from "react";

const points: { title: string; body: ReactNode }[] = [
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
        <Link href="/booking" className="font-semibold text-ocean-600 hover:text-ocean-800">
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
        <Link href="/services" className="font-semibold text-ocean-600 hover:text-ocean-800">
          all services
        </Link>{" "}
        before you pay.
      </>
    ),
  },
];

export function BlogWhyChooseSection() {
  return (
    <section
      className="mt-14 rounded-2xl border border-ocean-200 bg-gradient-to-br from-ocean-50 to-white p-6 sm:p-8"
      aria-labelledby="why-choose-heading"
    >
      <h2
        id="why-choose-heading"
        className="font-display text-xl font-bold text-ocean-900 sm:text-2xl"
      >
        Why travellers choose us over random beach touts
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ocean-700 sm:text-base">
        Goa has many operators. The difference is predictable scheduling, verified gear cycles,
        and support when weather shifts. Use this site to{" "}
        <Link href="/booking" className="font-semibold text-ocean-600 hover:text-ocean-800">
          book online
        </Link>{" "}
        with clear meeting times—or browse{" "}
        <Link href="/services" className="font-semibold text-ocean-600 hover:text-ocean-800">
          all services
        </Link>{" "}
        including scuba, tours, and water sports.
      </p>
      <ul className="mt-6 space-y-5">
        {points.map((p) => (
          <li key={p.title}>
            <p className="font-semibold text-ocean-900">{p.title}</p>
            <div className="mt-1 text-sm leading-relaxed text-ocean-700 sm:text-base">
              {p.body}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
