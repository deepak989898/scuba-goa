import type { ServiceItem } from "@/data/services";

function detailParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Full service copy only: admin detail body, else short line — no stock marketing blurbs.
 */
export function ServiceDetailSections({ service: s }: { service: ServiceItem }) {
  const custom = (s.detailContent ?? "").trim();
  const short = (s.short ?? "").trim();

  if (custom) {
    const paras = detailParagraphs(custom);
    return (
      <div className="space-y-4">
        {paras.map((p, i) => (
          <p
            key={i}
            className="text-base leading-relaxed text-ocean-800 sm:text-[17px] whitespace-pre-line"
          >
            {p}
          </p>
        ))}
      </div>
    );
  }

  if (short) {
    return (
      <p className="text-base leading-relaxed text-ocean-800 sm:text-[17px] whitespace-pre-line">
        {short}
      </p>
    );
  }

  return (
    <p className="text-base text-ocean-600">
      See options below or reach us on WhatsApp for timings and pickup.
    </p>
  );
}
