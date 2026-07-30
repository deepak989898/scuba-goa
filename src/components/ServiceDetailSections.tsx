import type { ServiceItem } from "@/data/services";
import Link from "next/link";
import { ServiceDetailProse } from "@/components/ServiceDetailProse";
import { ServiceInclusionCtas } from "@/components/cart/ServiceInclusionCtas";

const SCUBA_FALLBACK_CONTENT = `Scuba diving in Goa is one of the easiest ways for beginners and families to experience the Arabian Sea underwater. You do not need to be an expert swimmer to try an introductory dive with a certified instructor.

Your day usually starts with a clear safety briefing: hand signals, equalizing, mask clearing, and calm regulator breathing. Once you are comfortable, you join a supervised boat trip to the dive site — often around Grande Island or nearby coastal points — and explore at a controlled depth with one-on-one or small-group guidance.

Packages typically include gear, instructor support, and boat transfer where listed. Optional underwater photos, hotel pickup, and longer dive time depend on the option you choose. Morning slots are popular for calmer seas and smoother logistics.

Book online with live starting prices, then confirm your date, guests, and pickup on WhatsApp. Compare inclusions carefully before payment so your scuba diving price in Goa matches the experience you want.`;

const INCLUSION_HEADING_RE =
  /^(?:[^\w\s]+\s*)?(?:inclusions?|what'?s\s+included)\s*:?\s*$/i;

/** Remove admin-typed Inclusion / What's included lines so we don't duplicate our heading. */
function stripInclusionHeadings(text: string): string {
  return text
    .split("\n")
    .filter((line) => !INCLUSION_HEADING_RE.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Full service copy: short blurb, then gradient "Inclusion" heading, then detail body.
 */
export function ServiceDetailSections({ service: s }: { service: ServiceItem }) {
  const custom = stripInclusionHeadings((s.detailContent ?? "").trim());
  const short = (s.short ?? "").trim();
  const scubaFallback =
    s.slug === "scuba-diving" && !custom ? SCUBA_FALLBACK_CONTENT : "";

  let intro = short;
  let inclusionBody = custom;

  const paras = custom
    ? custom
        .split(/\n\s*\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  const norm = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();

  if (intro && paras.length > 1) {
    // Avoid repeating the same intro under Inclusion when it was pasted into detail copy
    const first = paras[0];
    if (
      norm(first) === norm(intro) ||
      norm(first).startsWith(norm(intro).slice(0, 48)) ||
      norm(intro).startsWith(norm(first).slice(0, 48))
    ) {
      inclusionBody = paras.slice(1).join("\n\n");
    }
  } else if (!intro && custom) {
    // No short field: first paragraph/line = intro, rest under Inclusion
    if (paras.length > 1) {
      intro = paras[0];
      inclusionBody = paras.slice(1).join("\n\n");
    } else {
      const lines = custom.split("\n").map((l) => l.trimEnd());
      const firstIdx = lines.findIndex((l) => l.trim());
      if (firstIdx >= 0 && lines.slice(firstIdx + 1).some((l) => l.trim())) {
        intro = lines[firstIdx].trim();
        inclusionBody = lines
          .slice(firstIdx + 1)
          .join("\n")
          .replace(/^\n+/, "")
          .trim();
      } else {
        intro = custom;
        inclusionBody = "";
      }
    }
  }

  if (!intro && !inclusionBody && !scubaFallback) {
    return (
      <p className="text-sm text-ocean-700 sm:text-base">
        See options below or reach us on WhatsApp for timings and pickup.
      </p>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {intro ? (
        <p className="text-sm leading-relaxed text-ocean-800 sm:text-[15px]">
          {intro}
        </p>
      ) : null}

      {inclusionBody ? (
        <div className="space-y-2">
          <ServiceInclusionCtas service={s} />
          <ServiceDetailProse text={inclusionBody} className="space-y-2.5" />
        </div>
      ) : null}

      {scubaFallback ? (
        <ServiceDetailProse text={scubaFallback} className="space-y-2.5" />
      ) : null}

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
