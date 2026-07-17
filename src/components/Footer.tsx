import Link from "next/link";
import Image from "next/image";
import { OfficeMapEmbed } from "@/components/OfficeMapEmbed";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_HREF,
  CONTACT_PHONE_LABEL,
  CONTACT_PHONE_SECOND_HREF,
  CONTACT_PHONE_SECOND_LABEL,
  MISSED_CALL_DISPLAY_LABEL,
  MISSED_CALL_TEL_HREF,
  OFFICE_ADDRESS_LINES,
  SITE_NAME,
  whatsappLink,
} from "@/lib/constants";

const quick = [
  { href: "/booking", label: "Book & pay online" },
  { href: "/offers", label: "Package offers" },
  { href: "/services", label: "All services" },
  { href: "/blog", label: "Travel blog" },
  { href: "/guides", label: "Guides" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
];

const legal = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/refund-cancellation", label: "Refund & Cancellation" },
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Link
              href="/"
              aria-label={`${SITE_NAME} home`}
              className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              <Image
                src="/book-scuba-goa-logo-transparent.png"
                alt={SITE_NAME}
                width={240}
                height={88}
                sizes="180px"
                className="h-auto w-[180px]"
                loading="lazy"
              />
            </Link>
            <p className="mt-4 bg-gradient-to-r from-cyan-300 via-sky-200 to-amber-300 bg-clip-text font-display text-xl font-bold text-transparent">
              {SITE_NAME}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-200">
              Premium <span className="font-semibold text-cyan-300">scuba diving</span>,{" "}
              <span className="font-semibold text-amber-300">Goa tour packages</span>,{" "}
              <span className="font-semibold text-emerald-300">water sports</span>,{" "}
              <span className="font-semibold text-fuchsia-300">
                nightlife &amp; adventure
              </span>
              —book fast with WhatsApp or secure online pay.
            </p>
          </div>
          <div className="lg:col-span-2">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-cyan-300">
              Quick links
            </p>
            <div className="mt-2 h-0.5 w-10 rounded-full bg-gradient-to-r from-cyan-400 to-sky-300" />
            <ul className="mt-4 space-y-1 text-sm text-slate-200">
              {quick.map((q) => (
                <li key={q.href}>
                  <Link
                    href={q.href}
                    className="group inline-flex min-h-8 items-center gap-2 transition hover:translate-x-1 hover:text-cyan-300"
                  >
                    <span
                      className="text-cyan-500 transition group-hover:text-cyan-300"
                      aria-hidden
                    >
                      ›
                    </span>
                    {q.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-amber-300">
              Legal
            </p>
            <div className="mt-2 h-0.5 w-10 rounded-full bg-gradient-to-r from-amber-400 to-yellow-200" />
            <ul className="mt-4 space-y-1 text-sm text-slate-200">
              {legal.map((q) => (
                <li key={q.href}>
                  <Link
                    href={q.href}
                    className="group inline-flex min-h-8 items-center gap-2 transition hover:translate-x-1 hover:text-amber-300"
                  >
                    <span
                      className="text-amber-500 transition group-hover:text-amber-300"
                      aria-hidden
                    >
                      ›
                    </span>
                    {q.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5 lg:pl-3">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-300">
              Contact
            </p>
            <div className="mt-2 h-0.5 w-10 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" />
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-200">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-300" aria-hidden>
                  ◆
                </span>
                <address className="not-italic">
                  {OFFICE_ADDRESS_LINES.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-cyan-300" aria-hidden>
                  ☎
                </span>
                <a
                  href={CONTACT_PHONE_HREF}
                  className="font-medium transition hover:text-cyan-300"
                >
                  <span className="text-slate-400">Call &amp; WhatsApp:</span>{" "}
                  {CONTACT_PHONE_LABEL}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-emerald-300" aria-hidden>
                  ↗
                </span>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-300 transition hover:text-emerald-200"
                >
                  Message on WhatsApp →
                </a>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-sky-300" aria-hidden>
                  ☎
                </span>
                <a
                  href={CONTACT_PHONE_SECOND_HREF}
                  className="transition hover:text-sky-300"
                >
                  <span className="text-slate-400">Secondary call:</span>{" "}
                  {CONTACT_PHONE_SECOND_LABEL}
                </a>
              </li>
              {MISSED_CALL_TEL_HREF !== CONTACT_PHONE_HREF ? (
                <li className="flex items-center gap-3">
                  <span className="text-amber-300" aria-hidden>
                    ◌
                  </span>
                  <a
                    href={MISSED_CALL_TEL_HREF}
                    className="transition hover:text-amber-300"
                  >
                    <span className="text-slate-400">Missed-call line:</span>{" "}
                    {MISSED_CALL_DISPLAY_LABEL}
                  </a>
                </li>
              ) : null}
              <li className="border-l-2 border-amber-400/70 pl-3 text-xs leading-relaxed text-slate-300">
                <span className="font-semibold text-amber-300">Missed-call callback:</span>{" "}
                ring once on{" "}
                <a
                  href={MISSED_CALL_TEL_HREF}
                  className="font-medium text-white transition hover:text-amber-300"
                >
                  {MISSED_CALL_DISPLAY_LABEL}
                </a>{" "}
                — we WhatsApp you back from your caller ID.
              </li>
              <li className="flex items-center gap-3">
                <span className="text-fuchsia-300" aria-hidden>
                  ✉
                </span>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="transition hover:text-fuchsia-300"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 lg:col-span-12">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-fuchsia-300">
              Location
            </p>
            <div className="mt-2 h-0.5 w-10 rounded-full bg-gradient-to-r from-fuchsia-400 to-pink-300" />
            <address className="mt-2 not-italic text-xs leading-relaxed text-slate-200">
              {OFFICE_ADDRESS_LINES.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <OfficeMapEmbed className="mt-3 w-full" height={260} />
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-slate-200">
          © {new Date().getFullYear()} {SITE_NAME}. Scuba diving Goa · Water
          sports Goa booking · Goa tour packages.
        </p>
      </div>
    </footer>
  );
}
