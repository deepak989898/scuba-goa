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
      className="mt-12 border-t border-ocean-100 pt-10"
    >
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
        Helpful information
      </p>
      <h2
        id="service-faq-title"
        className="mt-1 font-display text-2xl font-bold text-ocean-900 sm:text-3xl"
      >
        Frequently asked questions about {service.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ocean-700 sm:text-base">
        Read the important details before booking. Final timings, availability and
        inclusions are confirmed for your selected option.
      </p>

      <div className="mt-6 space-y-3">
        {faqs.map((faq, index) => (
          <details
            key={faq.question}
            className="group rounded-2xl border border-ocean-100 bg-sand px-4 shadow-sm open:border-cyan-300 open:bg-cyan-50/40 sm:px-5"
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}
