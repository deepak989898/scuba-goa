import type { Metadata } from "next";
import Link from "next/link";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_HREF,
  CONTACT_PHONE_LABEL,
  CONTACT_PHONE_SECOND_HREF,
  CONTACT_PHONE_SECOND_LABEL,
  OFFICE_ADDRESS_LINES,
  OFFICE_ADDRESS_SINGLELINE,
  SITE_NAME,
  SITE_URL,
  whatsappLink,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact Book Scuba Goa — Baga Office",
  description: `Visit us in Baga, Calangute — call, email, or WhatsApp ${SITE_NAME} for scuba diving and tour package bookings.`,
  alternates: {
    canonical: `${SITE_URL.replace(/\/$/, "")}/contact`,
  },
  openGraph: {
    title: `Contact | ${SITE_NAME}`,
    url: `${SITE_URL.replace(/\/$/, "")}/contact`,
  },
};

const waMessage =
  "Hi, I want to book scuba diving in Goa. Please share available slots.";

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_ADDRESS_SINGLELINE)}`;

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.28-.14-1.64-.81-1.9-.9-.25-.1-.44-.14-.62.14-.18.27-.71.9-.87 1.08-.16.18-.32.2-.6.07-.28-.14-1.17-.43-2.23-1.37-.82-.73-1.38-1.64-1.54-1.92-.16-.27-.02-.42.12-.55.13-.13.28-.32.42-.48.14-.16.18-.27.28-.45.09-.18.05-.34-.02-.48-.07-.14-.62-1.5-.85-2.05-.22-.53-.45-.46-.62-.47h-.53c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.3s.98 2.66 1.12 2.84c.14.18 1.93 2.95 4.67 4.13.65.28 1.16.45 1.56.57.65.21 1.25.18 1.72.11.52-.08 1.64-.67 1.87-1.32.23-.65.23-1.2.16-1.32-.07-.11-.25-.18-.53-.32z" />
      <path d="M12.04 2C6.5 2 2 6.48 2 12c0 1.93.55 3.73 1.5 5.27L2.1 22l4.87-1.28A9.94 9.94 0 0012.04 22C17.58 22 22 17.52 22 12S17.58 2 12.04 2zm0 18.13c-1.7 0-3.28-.5-4.6-1.36l-.33-.2-2.89.76.77-2.82-.21-.35A8.1 8.1 0 013.9 12c0-4.48 3.66-8.13 8.14-8.13 4.48 0 8.13 3.65 8.13 8.13 0 4.48-3.65 8.13-8.13 8.13z" />
    </svg>
  );
}

function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3h3.2l1.2 4.2-2 1.4a12.5 12.5 0 006 6l1.4-2 4.2 1.2V17a2 2 0 01-2.2 2A15.8 15.8 0 015 5.2 2 2 0 017 3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-5.4 7-11a7 7 0 10-14 0c0 5.6 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ContactPage() {
  return (
    <div className="bg-gradient-to-b from-ocean-50 via-white to-sand/40">
      {/* Compact hero band */}
      <section className="relative overflow-hidden border-b border-ocean-100 bg-ocean-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 40%, rgba(34,211,238,0.25), transparent 55%), radial-gradient(ellipse 60% 50% at 90% 20%, rgba(14,165,233,0.2), transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
            Contact
          </p>
          <h1 className="mt-1 max-w-2xl font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Talk to a real dive team in Baga
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
            Fastest replies on WhatsApp—same desk that confirms pickup, slots, and
            clear prices for scuba and water sports in North Goa.
          </p>
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <a
              href={whatsappLink(waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400"
            >
              <IconWhatsApp className="h-5 w-5" />
              Chat on WhatsApp
            </a>
            <Link
              href="/booking"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-400 px-6 py-2.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-300"
            >
              Reserve Your Dive
            </Link>
            <a
              href={CONTACT_PHONE_HREF}
              className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-white/40 bg-white/10 px-6 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Call {CONTACT_PHONE_LABEL}
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Reach us */}
          <section aria-labelledby="reach-us-heading">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
              Reach us
            </p>
            <h2
              id="reach-us-heading"
              className="mt-1 font-display text-xl font-bold text-ocean-900 sm:text-2xl"
            >
              WhatsApp, phone &amp; email
            </h2>
            <p className="mt-1.5 text-sm text-ocean-700">
              For same-day slots, WhatsApp is usually quickest. Use phone for urgent
              call-backs.
            </p>

            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  href={whatsappLink(waMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5 transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <IconWhatsApp className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-wide text-emerald-800">
                      WhatsApp
                    </span>
                    <span className="mt-0.5 block font-semibold text-ocean-900">
                      Message our concierge
                    </span>
                    <span className="mt-0.5 block text-sm text-ocean-700">
                      Bookings, pickup windows, package questions
                    </span>
                  </span>
                </a>
              </li>

              <li className="rounded-xl border border-ocean-100 bg-white p-3.5 shadow-sm">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                    <IconPhone className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-ocean-600">
                      Phone
                    </p>
                    <a
                      href={CONTACT_PHONE_HREF}
                      className="mt-0.5 block font-semibold text-ocean-900 hover:text-cyan-800"
                    >
                      Primary: {CONTACT_PHONE_LABEL}
                    </a>
                    <a
                      href={CONTACT_PHONE_SECOND_HREF}
                      className="mt-1 block text-sm font-medium text-ocean-700 hover:text-cyan-800"
                    >
                      Secondary: {CONTACT_PHONE_SECOND_LABEL}
                    </a>
                  </div>
                </div>
              </li>

              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex gap-3 rounded-xl border border-ocean-100 bg-white p-3.5 shadow-sm transition hover:border-cyan-200"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                    <IconMail className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-wide text-ocean-600">
                      Email
                    </span>
                    <span className="mt-0.5 block font-semibold text-ocean-900 break-all">
                      {CONTACT_EMAIL}
                    </span>
                    <span className="mt-0.5 block text-sm text-ocean-700">
                      Receipts, group enquiries, written confirmations
                    </span>
                  </span>
                </a>
              </li>
            </ul>
          </section>

          {/* Visit */}
          <section aria-labelledby="visit-heading">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
              Visit us
            </p>
            <h2
              id="visit-heading"
              className="mt-1 font-display text-xl font-bold text-ocean-900 sm:text-2xl"
            >
              Baga office desk
            </h2>
            <p className="mt-1.5 text-sm text-ocean-700">
              Near Tito&apos;s Lane — ask questions face-to-face. Same team that answers
              WhatsApp.
            </p>

            <ul className="mt-4 space-y-2.5">
              <li className="flex gap-3 rounded-xl border border-ocean-100 bg-ocean-50/60 p-3.5">
                <IconPin className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ocean-600">
                    Office address
                  </p>
                  <address className="mt-0.5 text-sm not-italic leading-snug text-ocean-900">
                    {OFFICE_ADDRESS_LINES.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                </div>
              </li>
              <li className="flex gap-3 rounded-xl border border-ocean-100 bg-ocean-50/60 p-3.5">
                <IconClock className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ocean-600">
                    Opening hours
                  </p>
                  <p className="mt-0.5 text-sm text-ocean-900">
                    Daily 8:00 AM – 8:00 PM (IST)
                  </p>
                </div>
              </li>
            </ul>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-ocean-800 px-5 py-2 text-sm font-bold text-white transition hover:bg-ocean-700"
              >
                Open in Google Maps
              </a>
              <Link
                href="/about"
                className="inline-flex min-h-10 items-center justify-center rounded-full border-2 border-ocean-300 bg-white px-5 py-2 text-sm font-semibold text-ocean-800 transition hover:border-ocean-400"
              >
                About our team
              </Link>
            </div>
          </section>
        </div>

        {/* Quick links strip */}
        <section
          className="mt-8 rounded-2xl border border-ocean-100 bg-white p-4 shadow-sm sm:p-5"
          aria-label="Quick links"
        >
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
            Before you message
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Link
              href="/services"
              className="rounded-xl border border-ocean-100 bg-ocean-50/50 px-3.5 py-3 transition hover:border-cyan-200 hover:bg-cyan-50/40"
            >
              <p className="font-display text-sm font-bold text-ocean-900">Browse services</p>
              <p className="mt-0.5 text-xs text-ocean-700">Scuba, tours &amp; water sports</p>
            </Link>
            <Link
              href="/booking"
              className="rounded-xl border border-ocean-100 bg-ocean-50/50 px-3.5 py-3 transition hover:border-cyan-200 hover:bg-cyan-50/40"
            >
              <p className="font-display text-sm font-bold text-ocean-900">Book online</p>
              <p className="mt-0.5 text-xs text-ocean-700">Live prices &amp; Razorpay checkout</p>
            </Link>
            <Link
              href="/refund-cancellation"
              className="rounded-xl border border-ocean-100 bg-ocean-50/50 px-3.5 py-3 transition hover:border-cyan-200 hover:bg-cyan-50/40"
            >
              <p className="font-display text-sm font-bold text-ocean-900">Refund rules</p>
              <p className="mt-0.5 text-xs text-ocean-700">Read before you pay</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
