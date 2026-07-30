import { ADVANCE_BOOKING_INR } from "@/lib/payment";

export function BookingAdvanceBanner() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-ocean-900 px-3 py-2.5 text-center shadow-md sm:flex-row sm:justify-center sm:gap-3 sm:px-5 sm:text-left">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-300" fill="currentColor">
          <path d="M2 7a2 2 0 012-2h16a2 2 0 012 2v2.5a2.5 2.5 0 010 5V17a2 2 0 01-2 2H4a2 2 0 01-2-2v-2.5a2.5 2.5 0 010-5V7zm4 1v8h12V8H6z" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-white sm:text-sm">
          Live prices in your cart — Pay ₹
          {ADVANCE_BOOKING_INR.toLocaleString("en-IN")} per person now (advance) ·
          rest on the day.
        </p>
      </div>
    </div>
  );
}
