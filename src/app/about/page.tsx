import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn how ${SITE_NAME} curates safe scuba diving Goa and tour experiences with vetted operators.`,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-bold text-ocean-900">
        Built for trust & speed
      </h1>
      <p className="mt-6 text-ocean-800">
        {SITE_NAME} is a conversion-focused booking layer for Goa’s best marine
        and nightlife partners. We standardize briefings, pickup windows, and refund
        rules so you spend less time negotiating on the shore.
      </p>
      <ul className="mt-8 list-inside list-disc space-y-2 text-ocean-700">
        <li>Small groups for scuba and water sports</li>
        <li>Live inventory synced to Firestore for admins</li>
        <li>Razorpay for domestic cards, UPI, and netbanking</li>
        <li>WhatsApp handoff after every successful payment</li>
      </ul>
      <Link
        href="/booking"
        className="mt-10 inline-flex rounded-full bg-ocean-gradient px-6 py-3 text-sm font-semibold text-white"
      >
        Start a booking
      </Link>
    </div>
  );
}
