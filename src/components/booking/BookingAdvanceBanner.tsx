import { ADVANCE_BOOKING_INR } from "@/lib/payment";

export function BookingAdvanceBanner() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-ocean-900 px-4 py-4 text-center shadow-md sm:flex-row sm:justify-center sm:gap-4 sm:px-6 sm:text-left">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-300" fill="currentColor">
          <path d="M2 7a2 2 0 012-2h16a2 2 0 012 2v2.5a2.5 2.5 0 010 5V17a2 2 0 01-2 2H4a2 2 0 01-2-2v-2.5a2.5 2.5 0 010-5V7zm4 1v8h12V8H6z" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white sm:text-base">
          Live prices in your cart — starting packages shown below.
        </p>
        <p className="mt-0.5 text-xs font-semibold text-cyan-100 sm:text-sm">
          Pay ₹{ADVANCE_BOOKING_INR.toLocaleString("en-IN")} per person now
          (advance) · Pay the rest on the day at the centre.
        </p>
      </div>
    </div>
  );
}
