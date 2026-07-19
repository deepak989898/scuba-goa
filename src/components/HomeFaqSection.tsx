import Link from "next/link";
import { BOOK_SCUBA_FAQ } from "@/lib/seo-health/faq-data";

/** Homepage FAQ column — matches FAQPage JSON-LD for rich results. */
export function HomeFaqSection() {
  return (
    <aside id="faq" className="min-w-0" aria-labelledby="home-faq-heading">
      <div className="lg:sticky lg:top-20">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
          Pricing & booking help
        </p>
        <h2
          id="home-faq-heading"
          className="mt-0.5 font-display text-lg font-bold text-ocean-900 sm:text-xl"
        >
          Scuba diving prices & packages — FAQs
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ocean-700">
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

        <div className="mt-4 space-y-2">
          {BOOK_SCUBA_FAQ.map((faq, index) => (
            <details
              key={faq.question}
              className="group rounded-xl border border-ocean-100 bg-white px-3 shadow-sm open:border-cyan-300 open:bg-cyan-50/40 sm:px-3.5"
              open={index === 0}
            >
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 py-2 text-sm font-semibold text-ocean-900 marker:hidden">
                <span>{faq.question}</span>
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sand text-base text-ocean-700 shadow-sm transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="border-t border-ocean-100 pb-3 pt-2 text-sm leading-6 text-ocean-800">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </aside>
  );
}
