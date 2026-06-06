import Link from "next/link";
import { whatsappLink } from "@/lib/constants";
import { ADVANCE_BOOKING_INR } from "@/lib/payment";

/**
 * Final on-page funnel step before /booking: explicit CTA + payment reassurance.
 */
export function HomeBookingCTASection() {
  const wa = whatsappLink(
    "Hi, I want to book scuba diving in Goa. Please confirm slot and share the ₹" +
      ADVANCE_BOOKING_INR +
      " advance payment link if needed."
  );

  return (
    // Hidden on phones — the persistent sticky bottom bar (Call / WhatsApp /
    // Book Today) already covers this conversion step on mobile and a second
    // full-bleed CTA below the gallery felt repetitive there. Shown from
    // `sm:` upward as a high-impact closing CTA on tablets and desktop.
    <section
      id="book"
      className="relative hidden overflow-hidden bg-gradient-to-b from-ocean-900 to-ocean-950 sm:block sm:py-20"
      aria-labelledby="home-book-cta-heading"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200/90 sm:text-sm">
          Ready when you are
        </p>
        <h2
          id="home-book-cta-heading"
          className="mt-2 font-display text-2xl font-bold text-white sm:text-4xl"
        >
          Dive into Adventure — Reserve Your Scuba Experience in Goa
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/85 sm:mt-4 sm:text-base">
          Choose your package, select your date, and dive in. Pay just ₹
          {ADVANCE_BOOKING_INR.toLocaleString("en-IN")} advance on Razorpay (UPI / card) — balance
          on the day.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href="/booking"
            className="inline-flex min-h-14 items-center justify-center rounded-full bg-cyan-500 px-10 py-4 text-base font-bold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-400 active:bg-cyan-300"
          >
            Reserve Your Dive Today
          </Link>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-white/40 bg-white/10 px-8 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
          >
            WhatsApp booking
          </a>
        </div>
        <p className="mt-6 text-xs text-white/60 sm:text-sm">
          Encrypted payments · Instant reference · Refund policy on site
        </p>
      </div>
    </section>
  );
}
