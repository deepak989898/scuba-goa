/** Citable FAQ blocks for FAQPage schema (AI Overview + rich results). */
export const BOOK_SCUBA_FAQ = [
  {
    question: "How do I book scuba diving in Goa online?",
    answer:
      "Visit Book Scuba Goa at bookscubagoa.com/booking, choose your scuba or tour package, enter your date and contact details, and pay securely with Razorpay. You receive WhatsApp confirmation after payment.",
  },
  {
    question: "What is the price for scuba diving in Goa?",
    answer:
      "Scuba diving prices in Goa typically start from introductory try-dive packages. Book Scuba Goa shows live starting prices on the scuba diving service page and booking page. Final cost depends on the package, boat transfer, gear, instructor time, and optional photos.",
  },
  {
    question: "What is included in scuba diving packages?",
    answer:
      "Most packages include a safety briefing, diving gear, instructor guidance, and boat transfer where listed. Always check the selected option for inclusions such as underwater photos, hotel pickup, and trip duration before payment.",
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
    question: "Can I combine scuba diving with water sports or Dudhsagar?",
    answer:
      "Yes. Many guests book scuba diving plus water sports or a Dudhsagar trip on separate days for comfort. Compare options on the services pages, then confirm slots together on the booking page or WhatsApp.",
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
