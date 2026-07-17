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
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          <div>
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
          <div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-cyan-300">
                  Quick links
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                  {quick.map((q) => (
                    <li key={q.href}>
                      <Link
                        href={q.href}
                        className="transition hover:text-cyan-300"
                      >
                        {q.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-amber-300">
                  Legal
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                  {legal.map((q) => (
                    <li key={q.href}>
                      <Link
                        href={q.href}
                        className="transition hover:text-amber-300"
                      >
                        {q.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-300">
              Contact
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li className="text-slate-200">
                {OFFICE_ADDRESS_LINES.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </li>
              <li>
                <a href={CONTACT_PHONE_HREF} className="hover:text-cyan-300">
                  Call &amp; WhatsApp: {CONTACT_PHONE_LABEL}
                </a>
              </li>
              <li>
                <a
                  href={whatsappLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-300"
                >
                  Message on WhatsApp →
                </a>
              </li>
              <li>
                <a href={CONTACT_PHONE_SECOND_HREF} className="hover:text-cyan-300">
                  Secondary call: {CONTACT_PHONE_SECOND_LABEL}
                </a>
              </li>
              {MISSED_CALL_TEL_HREF !== CONTACT_PHONE_HREF ? (
                <li>
                  <a href={MISSED_CALL_TEL_HREF} className="hover:text-cyan-300">
                    Missed-call line: {MISSED_CALL_DISPLAY_LABEL}
                  </a>
                </li>
              ) : null}
              <li className="text-xs text-slate-200">
                Missed-call callback: ring once on{" "}
                <a href={MISSED_CALL_TEL_HREF} className="text-slate-200 hover:text-cyan-300">
                  {MISSED_CALL_DISPLAY_LABEL}
                </a>{" "}
                — we WhatsApp you back from your caller ID.
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="hover:text-cyan-300"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-fuchsia-300">
              Location
            </p>
            <address className="mt-2 not-italic text-xs leading-relaxed text-slate-200">
              {OFFICE_ADDRESS_LINES.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <OfficeMapEmbed className="mt-3" height={200} />
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
