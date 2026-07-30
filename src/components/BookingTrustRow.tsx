/** Trust assurances — compact icon cards for above-the-fold booking. */

const TRUST_ITEMS = [
  {
    label: "Instant Confirmation",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="#dcfce7" />
        <path
          d="M7.5 12.5l3 3 6-6"
          stroke="#16a34a"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
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
          stroke="#c4b5fd"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="16" r="1.4" fill="#ede9fe" />
      </svg>
    ),
  },
  {
    label: "4.9★ Rated Experience",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#f59e0b" aria-hidden>
        <path d="M12 2.5l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.5 6.6 19.3l1-6.1L3.2 8.9l6.1-.9L12 2.5z" />
      </svg>
    ),
  },
  {
    label: "Free WhatsApp Support",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#22c55e" aria-hidden>
        <path d="M12 2a9.5 9.5 0 00-8.2 14.3L2.5 21.5l5.3-1.4A9.5 9.5 0 1012 2zm5.3 13.5c-.2.6-1.2 1.1-1.9 1.2-.5.1-1.1.2-3.5-.7-2.9-1.2-4.8-4.1-4.9-4.3-.2-.2-1.3-1.7-1.3-3.2 0-1.5.8-2.2 1.1-2.5.3-.3.6-.4.9-.4h.6c.2 0 .4 0 .6.5.2.6.8 2 .8 2.1.1.1.1.3 0 .5l-.4.7c-.1.2-.3.3-.1.6.1.3.6 1 1.3 1.6.9.8 1.6 1 1.9 1.1.3.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1.2.1 1.6.8 1.9.9.3.1.5.2.5.3.1.2.1.9-.1 1.5z" />
      </svg>
    ),
  },
] as const;

export function BookingTrustRow() {
  return (
    <ul
      className="mx-auto mt-3 grid max-w-4xl grid-cols-2 gap-2 lg:grid-cols-4"
      aria-label="Booking trust assurances"
    >
      {TRUST_ITEMS.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-2 rounded-xl border border-white/90 bg-white px-2.5 py-2 text-[11px] font-bold text-ocean-900 shadow-sm sm:text-xs"
        >
          <span className="shrink-0">{item.icon}</span>
          <span className="leading-snug">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
