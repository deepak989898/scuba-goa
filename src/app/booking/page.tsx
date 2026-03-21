import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingForm } from "@/components/BookingForm";

export const metadata: Metadata = {
  title: "Book Online",
  description:
    "Book scuba diving Goa and tours with Razorpay—UPI, cards, netbanking. No login required.",
};

export default function BookingPage() {
  return (
    <div className="bg-gradient-to-b from-ocean-50 to-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-center font-display text-3xl font-bold text-ocean-900 sm:text-4xl">
          Secure booking
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-ocean-700">
          Pick a single package here, or add multiple services from the site to your
          cart and pay from the floating cart button.
        </p>
        <div className="mt-10">
          <Suspense fallback={<p className="text-center text-ocean-600">Loading…</p>}>
            <BookingForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
