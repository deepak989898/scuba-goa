import type { Metadata } from "next";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_HREF,
  CONTACT_PHONE_LABEL,
  SITE_NAME,
  whatsappLink,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact",
  description: `Call, email, or WhatsApp ${SITE_NAME} for scuba diving and tour package bookings.`,
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
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
        <li>Studio: North Goa (Calangute–Baga belt)</li>
      </ul>
    </div>
  );
}
