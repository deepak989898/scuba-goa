import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `Terms and conditions for ${SITE_NAME}.`,
};

export default function TermsAndConditionsPage() {
  const updated = "26 Mar 2026";
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-ocean-900 sm:text-4xl">
          Terms &amp; Conditions
        </h1>
        <p className="mt-2 text-sm text-ocean-600">Last updated: {updated}</p>

        <div className="prose prose-slate mt-8 max-w-none prose-headings:font-display prose-headings:text-ocean-900 prose-a:text-ocean-700">
          <p>
            These Terms &amp; Conditions govern your use of <strong>{SITE_NAME}</strong>{" "}
            and bookings made through our website.
          </p>

          <h2>Bookings</h2>
          <ul>
            <li>
              By placing a booking, you confirm the details you provided are accurate.
            </li>
            <li>
              Booking confirmation is subject to availability and successful payment
              (where applicable).
            </li>
            <li>
              Some services are delivered by third-party operators. We coordinate
              scheduling and communication, but the on-ground service may be provided
              by partners.
            </li>
          </ul>

          <h2>Safety and eligibility</h2>
          <ul>
            <li>
              Participants must follow safety instructions provided by guides/operators.
            </li>
            <li>
              Activities may have age/health restrictions. If you have medical
              conditions, you should disclose them and follow operator guidance.
            </li>
            <li>
              We (or the operator) may refuse service if safety requirements are not met.
            </li>
          </ul>

          <h2>Pricing</h2>
          <ul>
            <li>
              Prices displayed may change based on season, availability, or operator
              updates.
            </li>
            <li>
              Where a minimum advance is collected, the remaining amount (if any) and
              inclusions will be communicated during confirmation.
            </li>
          </ul>

          <h2>Cancellations and refunds</h2>
          <p>
            Cancellation/refund terms are described in our Refund &amp; Cancellation
            Policy. By booking, you agree to that policy.
          </p>

          <h2>Website content</h2>
          <ul>
            <li>
              Images, itineraries, and inclusions are for guidance and may vary slightly
              depending on conditions and operator constraints.
            </li>
            <li>
              We may update site content at any time.
            </li>
          </ul>

          <h2>Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, <strong>{SITE_NAME}</strong> is not
            liable for indirect or consequential losses. Our liability, if any, will not
            exceed the amount you paid for the booking in question.
          </p>

          <h2>Governing law</h2>
          <p>
            These terms are governed by applicable laws in India. Any disputes are
            subject to the jurisdiction of the appropriate courts.
          </p>

          <h2>Contact</h2>
          <p>
            For questions about these terms, contact us via the details on the Contact page.
          </p>
        </div>
      </div>
    </main>
  );
}

