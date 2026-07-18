import type { ServiceItem } from "@/data/services";

export type ServiceFaq = {
  question: string;
  answer: string;
};

const SPECIFIC_FAQS: Record<string, ServiceFaq[]> = {
  "scuba-diving": [
    {
      question: "What is the price for scuba diving in Goa?",
      answer:
        "Introductory scuba packages usually start from the live “from” price shown on this page. The final amount depends on the option you select, boat transfer, instructor time, gear, and optional photos. Always confirm the package total before payment.",
    },
    {
      question: "What is included in scuba diving packages?",
      answer:
        "Typical inclusions are a safety briefing, diving gear, instructor guidance, and boat transfer where listed. Check your selected option for underwater photos, hotel pickup, and total duration.",
    },
    {
      question: "Can beginners book scuba diving in Goa?",
      answer:
        "Yes. Beginner experiences start with a safety briefing and guided practice. Tell the team about your swimming ability and any medical condition before confirming.",
    },
    {
      question: "Do I need to know swimming for scuba diving?",
      answer:
        "Requirements depend on the selected package. Many introductory dives accept non-swimmers under direct instructor supervision, but the operator makes the final safety decision.",
    },
    {
      question: "What will I experience on a scuba diving day?",
      answer:
        "Most guests complete check-in and briefing, travel by boat to the dive site, practice basic skills with an instructor, then enjoy a supervised underwater exploration at controlled depth. Timing varies by package and sea conditions.",
    },
  ],
  "north-goa-tour": [
    {
      question: "Which places are normally covered on the North Goa tour?",
      answer:
        "The route generally focuses on popular North Goa beaches, forts and nearby attractions. Exact stops depend on traffic, opening hours and the selected option.",
    },
    {
      question: "Can the North Goa sightseeing route be customized?",
      answer:
        "Private-cab options usually offer more flexibility than shared tours. Send your preferred stops before payment so timing and availability can be confirmed.",
    },
  ],
  "south-goa-tour": [
    {
      question: "What attractions are covered on the South Goa tour?",
      answer:
        "South Goa tours generally combine quieter beaches, heritage sites and scenic stops. The final itinerary depends on your package, traffic and opening times.",
    },
    {
      question: "Is the South Goa tour suitable for families?",
      answer:
        "It is generally a relaxed family sightseeing option. Mention children, older guests or mobility needs before booking so a suitable route can be confirmed.",
    },
  ],
  "dudhsagar-trip": [
    {
      question: "Does the Dudhsagar trip include the jeep safari?",
      answer:
        "Jeep inclusion depends on the package and seasonal access rules. Choose an option that explicitly lists jeep seats and confirm availability before payment.",
    },
    {
      question: "When is Dudhsagar Falls accessible?",
      answer:
        "Access is controlled by local authorities and can change with monsoon conditions, forest rules and road safety. Availability is confirmed for your travel date.",
    },
  ],
  "water-sports": [
    {
      question: "Which activities are included in the water-sports package?",
      answer:
        "Activities vary by package and may include options such as jet ski or parasailing. The exact activity count is shown in the option you select.",
    },
    {
      question: "Are water sports suitable for first-time guests?",
      answer:
        "Beginners receive a safety briefing and equipment where listed. Participation remains subject to weather, sea conditions and the operator's safety assessment.",
    },
  ],
  "dolphin-trip": [
    {
      question: "Are dolphin sightings guaranteed?",
      answer:
        "No. Dolphins are wild animals, so sightings cannot be guaranteed. Crews use local experience to choose suitable areas while respecting sea conditions.",
    },
    {
      question: "What is the best time for a dolphin trip?",
      answer:
        "Morning slots often have calmer conditions, but suitability varies by date. Confirm the recommended departure time when booking.",
    },
  ],
  "casino-bookings": [
    {
      question: "What does the casino entry package include?",
      answer:
        "Inclusions vary by venue and may cover entry, food, entertainment or promotional chips. Review the selected option carefully before payment.",
    },
    {
      question: "Is identification required for casino entry?",
      answer:
        "Yes. Carry an original valid government-issued photo ID. Entry is subject to the casino's age, dress-code and admission policies.",
    },
  ],
  "night-club": [
    {
      question: "Does a nightclub booking guarantee entry?",
      answer:
        "Final entry remains subject to the venue's age, ID, dress-code, group and conduct policies. Your confirmation covers only its stated inclusions.",
    },
    {
      question: "Are table and cover charges included?",
      answer:
        "Only items shown in the selected package are included. Table minimums, food, drinks and special-event surcharges may be additional.",
    },
  ],
  pubs: [
    {
      question: "What is included in the Goa pub experience?",
      answer:
        "The selected option may include a planned route, guide or cover benefits. Drinks and food are extra unless explicitly listed in your confirmation.",
    },
    {
      question: "Is the pub experience suitable for solo travelers?",
      answer:
        "Group pub experiences can suit solo travelers, subject to the minimum group size and availability for the selected date.",
    },
  ],
  disco: [
    {
      question: "What does the disco booking include?",
      answer:
        "It includes only the entry or guest-list benefits displayed for your option. Drinks, food, tables and special events may cost extra.",
    },
    {
      question: "Do weekend and event prices change?",
      answer:
        "Yes. Prices and availability may change on weekends, holidays and special-event nights. Confirm your date and final amount before payment.",
    },
  ],
  flyboarding: [
    {
      question: "Can a beginner try flyboarding?",
      answer:
        "Beginner sessions include instruction and supervised practice, but participation depends on the operator's fitness and safety assessment.",
    },
    {
      question: "Can flyboarding be cancelled because of weather?",
      answer:
        "Yes. Wind, waves and visibility can make the activity unsafe. The operator may reschedule or cancel under the confirmed booking policy.",
    },
  ],
  "bungee-jumping": [
    {
      question: "Who can participate in bungee jumping?",
      answer:
        "Participation is subject to the operator's age, weight, fitness and medical rules. Share any medical condition before payment.",
    },
    {
      question: "Are photos or videos included with the jump?",
      answer:
        "Media may be an optional add-on unless explicitly included in your package. Confirm its price and delivery method before the jump.",
    },
  ],
};

export function getServiceFaqs(service: ServiceItem): ServiceFaq[] {
  const specific = SPECIFIC_FAQS[service.slug] ?? [
    {
      question: `Who is ${service.title} suitable for?`,
      answer:
        "Suitability depends on the selected option and operator rules. Share ages, group size and any special requirements before payment.",
    },
    {
      question: `Can ${service.title} be affected by weather or availability?`,
      answer:
        "Yes. Outdoor activities, transport and venue entry can change because of weather, safety conditions or supplier availability.",
    },
  ];
  const includedText = service.includes.filter(Boolean).join(", ");

  return [
    ...specific,
    {
      question: `How long does ${service.title} take?`,
      answer: `The listed duration is approximately ${service.duration}. Timing can vary with pickup, traffic, weather and the selected option.`,
    },
    {
      question: `What is included with ${service.title}?`,
      answer: includedText
        ? `Current listed inclusions are: ${includedText}. Check the final option because inclusions can differ by package.`
        : "Inclusions depend on the selected option and are shown before confirmation.",
    },
    {
      question: `How much does ${service.title} cost?`,
      answer: `Prices currently start from ₹${service.priceFrom.toLocaleString("en-IN")}. The final amount depends on date, group size, availability and selected add-ons.`,
    },
    {
      question: `How do I book ${service.title}?`,
      answer:
        "Select an option and add it to your cart, or contact the team on WhatsApp. Check the date, guest details, inclusions and final price before payment.",
    },
  ];
}
