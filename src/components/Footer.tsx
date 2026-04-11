import Link from "next/link";
import { OfficeMapEmbed } from "@/components/OfficeMapEmbed";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_HREF,
  CONTACT_PHONE_LABEL,
  MISSED_CALL_DISPLAY_LABEL,
  MISSED_CALL_TEL_HREF,
  OFFICE_ADDRESS_LINES,
  SITE_NAME,
} from "@/lib/constants";

const quick = [
  { href: "/booking", label: "Book & pay online" },
  { href: "/offers", label: "Package offers" },
  { href: "/services", label: "All services" },
  { href: "/blog", label: "Travel blog" },
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
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-xl font-semibold text-slate-100">
              {SITE_NAME}
            </p>
            <p className="mt-3 max-w-xs text-sm text-slate-300">
              Premium scuba diving, Goa tour packages, water sports, nightlife &
              adventure—book fast with WhatsApp or secure online pay.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Quick links</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {quick.map((q) => (
                <li key={q.href}>
                  <Link href={q.href} className="hover:text-cyan-300">
                    {q.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {legal.map((q) => (
                <li key={q.href}>
                  <Link href={q.href} className="hover:text-cyan-300">
                    {q.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Contact</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li className="text-slate-200">
                {OFFICE_ADDRESS_LINES.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </li>
              <li>
                <a href={CONTACT_PHONE_HREF} className="hover:text-cyan-300">
                  {CONTACT_PHONE_LABEL}
                </a>
              </li>
              {MISSED_CALL_TEL_HREF !== CONTACT_PHONE_HREF ? (
                <li>
                  <a href={MISSED_CALL_TEL_HREF} className="hover:text-cyan-300">
                    Missed-call line: {MISSED_CALL_DISPLAY_LABEL}
                  </a>
                </li>
              ) : null}
              <li className="text-xs text-slate-400">
                Missed-call callback: ring once on{" "}
                <a href={MISSED_CALL_TEL_HREF} className="text-slate-300 hover:text-cyan-300">
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
          <div className="md:col-span-2 lg:col-span-1">
            <p className="text-sm font-semibold text-slate-100">Location</p>
            <address className="mt-2 not-italic text-xs leading-relaxed text-slate-300">
              {OFFICE_ADDRESS_LINES.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <OfficeMapEmbed className="mt-3" height={200} />
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {SITE_NAME}. Scuba diving Goa · Water
          sports Goa booking · Goa tour packages.
        </p>
      </div>
    </footer>
  );
}
