import Link from "next/link";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_HREF,
  CONTACT_PHONE_LABEL,
  SITE_NAME,
} from "@/lib/constants";

const quick = [
  { href: "/services", label: "All Services" },
  { href: "/booking", label: "Book Online" },
  { href: "/blog", label: "Travel Blog" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
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
            <p className="text-sm font-semibold text-slate-100">Contact</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>Calangute–Baga belt, North Goa</li>
              <li>
                <a href={CONTACT_PHONE_HREF} className="hover:text-cyan-300">
                  {CONTACT_PHONE_LABEL}
                </a>
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
            <p className="text-sm font-semibold text-slate-100">Location</p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-sm">
              <iframe
                title="Goa map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d98423.0!2d73.7!3d15.5!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bbfba1065555555%3A0x0!2sCalangute%2C%20Goa!5e0!3m2!1sen!2sin!4v1"
                width="100%"
                height="160"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
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
