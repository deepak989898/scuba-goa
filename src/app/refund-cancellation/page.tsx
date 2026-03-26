import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: `Refund and cancellation policy for ${SITE_NAME}.`,
};

export default function RefundCancellationPage() {
  const updated = "26 Mar 2026";
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-ocean-900 sm:text-4xl">
          Refund &amp; Cancellation Policy
        </h1>
        <p className="mt-2 text-sm text-ocean-600">Last updated: {updated}</p>

        <div className="prose prose-slate mt-8 max-w-none prose-headings:font-display prose-headings:text-ocean-900 prose-a:text-ocean-700">
          <p>
            This policy explains cancellations, rescheduling, and refunds for
            bookings made on <strong>{SITE_NAME}</strong>.
          </p>

          <h2>Before you book</h2>
          <ul>
            <li>
              Some activities depend on sea conditions, operator availability, and
              safety guidelines.
            </li>
            <li>
              Prices may include a minimum advance to confirm your slot. The remaining
              amount (if any) may be payable at the venue/operator as communicated.
            </li>
          </ul>

          <h2>Customer cancellation</h2>
          <ul>
            <li>
              <strong>More than 24 hours before</strong>: reschedule subject to
              availability, or refund (excluding payment gateway charges, if any).
            </li>
            <li>
              <strong>Within 24 hours</strong>: refund is not guaranteed because slots
              and logistics are reserved; rescheduling may be offered at our discretion
              depending on operator policies.
            </li>
            <li>
              <strong>No-show / late arrival</strong>: typically non-refundable.
            </li>
          </ul>

          <h2>Operator/weather cancellation</h2>
          <ul>
            <li>
              If an activity is cancelled due to safety/weather/operational reasons,
              we will offer <strong>rescheduling</strong> or a <strong>refund</strong>
              for the affected portion, as applicable.
            </li>
          </ul>

          <h2>Refund timeline</h2>
          <p>
            Approved refunds are processed to the original payment method. Typical
            timelines are <strong>5–10 business days</strong>, depending on your bank
            or payment provider.
          </p>

          <h2>How to request a cancellation/refund</h2>
          <p>
            Contact us with your booking details (name, phone, date, and payment/order
            ID). We may ask for additional details to verify the request.
          </p>

          <h2>Important notes</h2>
          <ul>
            <li>
              Any convenience or gateway charges (if applicable) may be non-refundable.
            </li>
            <li>
              Partial refunds may apply if only part of the booking is cancelled or
              delivered.
            </li>
            <li>
              Final decisions may depend on operator terms and safety requirements.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}

