type FaqItem = { question: string; answer: string };

type Props = {
  faqs: FaqItem[];
  id?: string;
  className?: string;
};

/** Shared FAQ accordion for guide and blog detail pages. */
export function ContentFaqSection({
  faqs,
  id = "content-faq-heading",
  className = "mt-6 border-t border-ocean-100 pt-6",
}: Props) {
  if (faqs.length === 0) return null;

  return (
    <section className={className} aria-labelledby={id}>
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
        Helpful answers
      </p>
      <h2
        id={id}
        className="mt-1 font-display text-xl font-bold text-ocean-900 sm:text-2xl"
      >
        Frequently Asked Questions
      </h2>
      <p className="mt-2 text-sm leading-6 text-ocean-700">
        Quick answers on pricing, location, booking, and what to expect before
        you visit.
      </p>
      <div className="mt-4 space-y-3">
        {faqs.map((faq, index) => (
          <details
            key={faq.question}
            className="group rounded-xl border border-ocean-100 bg-sand px-4 shadow-sm open:border-cyan-300 open:bg-cyan-50/40 sm:px-5"
            open={index === 0}
          >
            <summary
              className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-ocean-900 marker:hidden"
            >
              <span>{faq.question}</span>
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-base text-ocean-700 shadow-sm transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="border-t border-ocean-100 pb-3 pt-2 text-sm leading-relaxed text-ocean-800">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
