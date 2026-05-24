import { OFFICE_ADDRESS_SINGLELINE, SITE_NAME, SITE_URL } from "@/lib/constants";

const base = SITE_URL.replace(/\/$/, "");
const logo = `${base}/book-scuba-goa-logo.png`;

/** Site-wide structured data for Google entity linking and AI citations. */
export function SiteJsonLd() {
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${base}/`,
    description:
      "Book scuba diving in Goa, water sports, island trips, and tour packages with clear live prices and online checkout.",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: `${base}/`,
      logo: { "@type": "ImageObject", url: logo },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${base}/blog?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: SITE_NAME,
    url: `${base}/`,
    image: logo,
    description:
      "Scuba diving, Grande Island trips, water sports, and Goa tour packages with hotel pickup from Baga and Calangute.",
    address: {
      "@type": "PostalAddress",
      streetAddress: OFFICE_ADDRESS_SINGLELINE,
      addressLocality: "Baga",
      addressRegion: "Goa",
      postalCode: "403516",
      addressCountry: "IN",
    },
    areaServed: { "@type": "AdministrativeArea", name: "Goa, India" },
    priceRange: "₹₹",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}
      />
    </>
  );
}
