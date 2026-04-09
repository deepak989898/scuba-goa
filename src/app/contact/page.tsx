import type { Metadata } from "next";
import { OfficeMapEmbed } from "@/components/OfficeMapEmbed";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_HREF,
  CONTACT_PHONE_LABEL,
  OFFICE_ADDRESS_LINES,
  OFFICE_ADDRESS_SINGLELINE,
  SITE_NAME,
  whatsappLink,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact",
  description: `Visit us in Baga, Calangute — call, email, or WhatsApp ${SITE_NAME} for scuba diving and tour package bookings.`,
};

export default function ContactPage() {
  const mapsQuery = encodeURIComponent(OFFICE_ADDRESS_SINGLELINE);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:max-w-4xl lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ocean-900">Contact</h1>
      <p className="mt-4 text-ocean-700">
        We respond fastest on WhatsApp—especially for same-day scuba diving Goa and
        water sports Goa booking slots.
      </p>
      <ul className="mt-8 space-y-4 text-ocean-800">
        <li>
          <a
            href={whatsappLink()}
            className="font-semibold text-ocean-600 hover:underline"
          >
            WhatsApp concierge
          </a>
        </li>
        <li>
          Phone:{" "}
          <a href={CONTACT_PHONE_HREF} className="text-ocean-600">
            {CONTACT_PHONE_LABEL}
          </a>
        </li>
        <li>
          Email:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-ocean-600">
            {CONTACT_EMAIL}
          </a>
        </li>
        <li>
          <span className="font-semibold text-ocean-900">Office address</span>
          <address className="mt-1 not-italic text-ocean-700">
            {OFFICE_ADDRESS_LINES.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-semibold text-cyan-700 hover:underline"
          >
            Open in Google Maps →
          </a>
        </li>
      </ul>

      <section className="mt-12 border-t border-ocean-100 pt-10" aria-labelledby="contact-map-heading">
        <h2
          id="contact-map-heading"
          className="font-display text-xl font-bold text-ocean-900"
        >
          Find us
        </h2>
        <p className="mt-2 text-sm text-ocean-600">
          Near Tito&apos;s Lane, Baga — same pin as our map listing (Scuba Diving with
          Island Trip).
        </p>
        <OfficeMapEmbed
          className="mt-4"
          height="min(55vw, 360px)"
          surface="light"
        />
      </section>
    </div>
  );
}
