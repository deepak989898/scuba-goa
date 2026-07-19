import type { ServiceItem } from "@/data/services";
import { getServiceFaqs } from "@/lib/service-faqs";

export function ServiceFaqs({ service }: { service: ServiceItem }) {
  const faqs = getServiceFaqs(service);
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <section
      aria-labelledby="service-faq-title"
      className="mt-6 border-t border-ocean-100 pt-5"
    >
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
        Helpful information
      </p>
      <h2
        id="service-faq-title"
        className="mt-0.5 font-display text-xl font-bold text-ocean-900 sm:text-2xl"
      >
        Frequently asked questions about {service.title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-snug text-ocean-700">
        Read the important details before booking. Final timings, availability and
        inclusions are confirmed for your selected option.
      </p>

      <div className="mt-3 space-y-2">
        {faqs.map((faq, index) => (
          <details
            key={faq.question}
            className="group rounded-xl border border-ocean-100 bg-sand px-3 shadow-sm open:border-cyan-300 open:bg-cyan-50/40 sm:px-4"
            open={index === 0}
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2.5 text-sm font-semibold text-ocean-900 marker:hidden sm:text-base">
              <span>{faq.question}</span>
              <span
                aria-hidden
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-base text-ocean-700 shadow-sm transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="border-t border-ocean-100 pb-3 pt-2.5 text-sm leading-relaxed text-ocean-800">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}
