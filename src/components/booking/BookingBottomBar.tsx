import { ADVANCE_BOOKING_INR } from "@/lib/payment";

const ITEMS = [
  {
    label: "Instant Confirmation",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <path
          d="M13 2L4 14h7l-1 8 10-14h-7l0-6z"
          fill="#22c55e"
          stroke="#16a34a"
          strokeWidth="1"
        />
      </svg>
    ),
  },
  {
    label: "Secure Razorpay Payment",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <rect x="5" y="11" width="14" height="10" rx="2" fill="#7c3aed" />
        <path
          d="M8 11V8a4 4 0 118 0v3"
          stroke="#a78bfa"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "Live Support on WhatsApp",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#22c55e" aria-hidden>
        <path d="M12 2a9.5 9.5 0 00-8.2 14.3L2.5 21.5l5.3-1.4A9.5 9.5 0 1012 2zm5.3 13.5c-.2.6-1.2 1.1-1.9 1.2-.5.1-1.1.2-3.5-.7-2.9-1.2-4.8-4.1-4.9-4.3-.2-.2-1.3-1.7-1.3-3.2 0-1.5.8-2.2 1.1-2.5.3-.3.6-.4.9-.4h.6c.2 0 .4 0 .6.5.2.6.8 2 .8 2.1.1.1.1.3 0 .5l-.4.7c-.1.2-.3.3-.1.6.1.3.6 1 1.3 1.6.9.8 1.6 1 1.9 1.1.3.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1.2.1 1.6.8 1.9.9.3.1.5.2.5.3.1.2.1.9-.1 1.5z" />
      </svg>
    ),
  },
  {
    label: `Pay Advance ₹${ADVANCE_BOOKING_INR.toLocaleString("en-IN")}`,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <rect x="2" y="5" width="20" height="14" rx="2" fill="#ef4444" />
        <rect x="2" y="8" width="20" height="3" fill="#b91c1c" />
        <rect x="5" y="14" width="6" height="2" rx="1" fill="#fecaca" />
      </svg>
    ),
  },
] as const;

export function BookingBottomBar() {
  return (
    <div className="overflow-hidden rounded-xl bg-ocean-950 shadow-md">
      <ul className="grid grid-cols-2 divide-x divide-y divide-white/10 lg:grid-cols-4 lg:divide-y-0">
        {ITEMS.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2 px-3 py-2.5 sm:px-4"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
              {item.icon}
            </span>
            <span className="text-[11px] font-bold leading-snug text-white sm:text-xs">
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
