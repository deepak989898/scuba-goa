import type { ServiceItem } from "@/data/services";
import Link from "next/link";

function detailParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const SCUBA_FALLBACK_CONTENT = `Scuba diving in Goa is one of the easiest ways for beginners and families to experience the Arabian Sea underwater. You do not need to be an expert swimmer to try an introductory dive with a certified instructor.

Your day usually starts with a clear safety briefing: hand signals, equalizing, mask clearing, and calm regulator breathing. Once you are comfortable, you join a supervised boat trip to the dive site — often around Grande Island or nearby coastal points — and explore at a controlled depth with one-on-one or small-group guidance.

Packages typically include gear, instructor support, and boat transfer where listed. Optional underwater photos, hotel pickup, and longer dive time depend on the option you choose. Morning slots are popular for calmer seas and smoother logistics.

Book online with live starting prices, then confirm your date, guests, and pickup on WhatsApp. Compare inclusions carefully before payment so your scuba diving price in Goa matches the experience you want.`;

/**
 * Full service copy: admin detail body, scuba SEO fallback, else short line.
 */
export function ServiceDetailSections({ service: s }: { service: ServiceItem }) {
  const custom = (s.detailContent ?? "").trim();
  const short = (s.short ?? "").trim();
  const body =
    custom ||
    (s.slug === "scuba-diving" ? SCUBA_FALLBACK_CONTENT : "") ||
    short;

  if (!body) {
    return (
      <p className="text-sm text-ocean-700 sm:text-base">
        See options below or reach us on WhatsApp for timings and pickup.
      </p>
    );
  }

  const paras = detailParagraphs(body);

  return (
    <div className="space-y-2.5">
      {paras.map((p, i) => (
        <p
          key={i}
          className="text-sm leading-relaxed text-ocean-800 sm:text-[15px] whitespace-pre-line"
        >
          {p}
        </p>
      ))}

      {s.slug === "scuba-diving" ? (
        <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50/50 p-3 sm:p-3.5">
          <h2 className="font-display text-base font-bold text-cyan-900 sm:text-lg">
            What you will experience
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-snug text-ocean-800">
            <li>
              <strong>Briefing &amp; skills:</strong> Breathing, signals, and
              mask clearing before you enter the water.
            </li>
            <li>
              <strong>Boat ride:</strong> Scenic transfer to the dive point with
              crew safety instructions.
            </li>
            <li>
              <strong>Guided dive:</strong> Supervised exploration at controlled
              depth with instructor support.
            </li>
            <li>
              <strong>Gear &amp; safety:</strong> Equipment checks, life jackets
              for boat movement, and calm pacing for first-timers.
            </li>
          </ul>
          <p className="mt-2.5 text-xs text-ocean-700 sm:text-sm">
            Also explore{" "}
            <Link
              href="/services/water-sports"
              className="font-semibold text-cyan-800 underline"
            >
              water sports in Goa
            </Link>
            {" · "}
            <Link
              href="/services/dudhsagar-trip"
              className="font-semibold text-cyan-800 underline"
            >
              Dudhsagar trip
            </Link>
            {" · "}
            <Link href="/booking" className="font-semibold text-cyan-800 underline">
              book live slots
            </Link>
            .
          </p>
        </div>
      ) : null}
    </div>
  );
}
