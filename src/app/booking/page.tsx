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
          Add packages or services from the dropdown into your cart, set quantities,
          then pay here or use the floating cart on other pages.
        </p>
        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-amber-900">
            Only a few peak slots left for tomorrow. Book now to lock your slot.
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Limited-time ad offer: up to ₹500 off on selected plans (confirm during
            booking/WhatsApp).
          </p>
        </div>
        <div className="mt-10">
          <Suspense fallback={<p className="text-center text-ocean-600">Loading…</p>}>
            <BookingForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
