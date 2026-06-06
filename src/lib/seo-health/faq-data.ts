/** Citable FAQ blocks for FAQPage schema (AI Overview + rich results). */
export const BOOK_SCUBA_FAQ = [
  {
    question: "How do I book scuba diving in Goa online?",
    answer:
      "Visit Book Scuba Goa at bookscubagoa.com/booking, choose your scuba or tour package, enter your date and contact details, and pay securely with Razorpay. You receive WhatsApp confirmation after payment.",
  },
  {
    question: "What is the scuba diving price in Goa?",
    answer:
      "Scuba diving in Goa typically starts from introductory try-dive packages. Book Scuba Goa lists live package prices on the booking page and service pages — prices vary by activity, duration, and inclusions such as boat transfer and equipment.",
  },
  {
    question: "Is scuba diving in Goa safe for beginners?",
    answer:
      "Yes. Introductory dives in Goa use certified instructors, controlled depth, pre-dive briefing, and supervised equipment checks. Non-swimmers can often join with extra guidance — confirm when booking.",
  },
  {
    question: "What is the best time for scuba diving in Goa?",
    answer:
      "October to May is the main season with calmer seas. Morning slots are popular for visibility and comfort. Monsoon months (June–September) have limited diving — check availability before travel.",
  },
  {
    question: "Where does scuba diving happen in Goa?",
    answer:
      "Popular sites include Grande Island and coastal dive points accessible by boat from North Goa (Baga, Calangute, Candolim area). Book Scuba Goa coordinates pickup and slot timing when you book online.",
  },
  {
    question: "Can I book Grand Island scuba diving through Book Scuba Goa?",
    answer:
      "Yes. Grand Island and boat-based scuba packages are available on Book Scuba Goa with online checkout, transparent pricing, and WhatsApp support from our Baga office.",
  },
] as const;

export function faqPageJsonLd(faqs: readonly { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}
