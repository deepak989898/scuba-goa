/** Compact trust assurances for the booking page (replaces site-wide TrustTopStrip). */

const TRUST_ITEMS = [
  "Instant Confirmation",
  "Secure Razorpay Payment",
  "4.9★ Rated Experience",
  "Free WhatsApp Support",
] as const;

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function BookingTrustRow() {
  return (
    <ul
      className="mx-auto mt-4 grid max-w-3xl grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3"
      aria-label="Booking trust assurances"
    >
      {TRUST_ITEMS.map((label) => (
        <li
          key={label}
          className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-white/90 px-3 py-2 text-sm font-semibold text-ocean-900 shadow-sm"
        >
          <CheckIcon className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
