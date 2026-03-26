import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${SITE_NAME}.`,
};

export default function PrivacyPolicyPage() {
  const updated = "26 Mar 2026";
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-ocean-900 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-ocean-600">Last updated: {updated}</p>

        <div className="prose prose-slate mt-8 max-w-none prose-headings:font-display prose-headings:text-ocean-900 prose-a:text-ocean-700">
          <p>
            This Privacy Policy explains how <strong>{SITE_NAME}</strong> collects,
            uses, and shares information when you visit our website or make an
            enquiry/booking.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Contact details</strong>: name, phone number (including
              WhatsApp), email address, and pickup location (if provided).
            </li>
            <li>
              <strong>Booking/payment details</strong>: selected items, quantities,
              date, and payment status. Card/UPI details are processed by our payment
              provider and are not stored on our servers.
            </li>
            <li>
              <strong>Usage data</strong>: basic analytics such as pages visited and
              approximate session activity to improve the site and prevent abuse.
            </li>
          </ul>

          <h2>How we use your information</h2>
          <ul>
            <li>To respond to enquiries and confirm bookings.</li>
            <li>To process payments and send receipts/booking confirmations.</li>
            <li>To provide customer support and coordinate pickups.</li>
            <li>To improve website performance, content, and user experience.</li>
            <li>To prevent fraud, misuse, or security incidents.</li>
          </ul>

          <h2>Sharing of information</h2>
          <p>We may share information only when necessary, such as:</p>
          <ul>
            <li>
              <strong>Service partners/operators</strong> to deliver the booked
              activity (e.g., pickup coordination and slot scheduling).
            </li>
            <li>
              <strong>Payment providers</strong> (e.g., Razorpay) to process
              transactions.
            </li>
            <li>
              <strong>Legal/compliance</strong> if required by law or to protect our
              rights and users.
            </li>
          </ul>

          <h2>Data retention</h2>
          <p>
            We retain booking and support records as needed for operations, dispute
            handling, accounting, and compliance. Analytics data may be retained in
            aggregated form.
          </p>

          <h2>Cookies</h2>
          <p>
            We may use essential cookies/local storage for site functionality (for
            example, cart/session features) and limited analytics.
          </p>

          <h2>Your choices</h2>
          <ul>
            <li>
              You can request correction or deletion of your personal information,
              subject to legal and operational requirements.
            </li>
            <li>
              You can opt out of promotional communication by replying “STOP” on
              WhatsApp/email (if applicable).
            </li>
          </ul>

          <h2>Security</h2>
          <p>
            We use reasonable security practices to protect information. No method of
            transmission over the internet is 100% secure, so we cannot guarantee
            absolute security.
          </p>

          <h2>Contact</h2>
          <p>
            If you have questions about this Privacy Policy, contact us via the
            details on the Contact page.
          </p>
        </div>
      </div>
    </main>
  );
}

