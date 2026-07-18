import Link from "next/link";
import { BOOK_SCUBA_FAQ } from "@/lib/seo-health/faq-data";

/** Visible homepage FAQ block — matches FAQPage JSON-LD for rich results. */
export function HomeFaqSection() {
  return (
    <section
      id="faq"
      className="border-t border-ocean-100 bg-white py-12 sm:py-16"
      aria-labelledby="home-faq-heading"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
          Pricing & booking help
        </p>
        <h2
          id="home-faq-heading"
          className="mt-1 font-display text-2xl font-bold text-ocean-900 sm:text-3xl"
        >
          Scuba diving prices & packages — FAQs
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ocean-700 sm:text-base">
          Clear answers before you book. For live rates, open{" "}
          <Link
            href="/services/scuba-diving"
            className="font-semibold text-cyan-800 underline decoration-cyan-300 underline-offset-2"
          >
            scuba diving packages
          </Link>{" "}
          or the{" "}
          <Link
            href="/booking"
            className="font-semibold text-cyan-800 underline decoration-cyan-300 underline-offset-2"
          >
            booking page
          </Link>
          .
        </p>

        <div className="mt-6 space-y-3">
          {BOOK_SCUBA_FAQ.map((faq, index) => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-ocean-100 bg-sand/50 px-4 shadow-sm open:border-cyan-300 open:bg-cyan-50/40 sm:px-5"
              open={index === 0}
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-ocean-900 marker:hidden">
                <span>{faq.question}</span>
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-lg text-ocean-700 shadow-sm transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="border-t border-ocean-100 pb-5 pt-4 text-sm leading-7 text-ocean-800 sm:text-base">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
