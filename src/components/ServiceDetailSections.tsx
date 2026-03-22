import type { ServiceItem } from "@/data/services";

function detailParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function ServiceDetailSections({ service: s }: { service: ServiceItem }) {
  const hasCustom = Boolean(s.detailContent?.trim());
  const paras = hasCustom ? detailParagraphs(s.detailContent!) : [];

  return (
    <>
      {hasCustom ? (
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
      ) : (
        <>
          <p className="text-base leading-relaxed text-ocean-800 sm:text-[17px]">
            Lock slots early during peak season. Live packages and services can be
            updated from the admin panel without redeploying.
          </p>
          <p className="mt-4 text-base leading-relaxed text-ocean-800 sm:text-[17px]">
            Tell us your hotel zone, group size, and preferred time—we route you to the
            right boat, cab, or club partner.{" "}
            <strong>Scuba diving Goa</strong> and{" "}
            <strong>water sports Goa booking</strong> combos are popular on weekends;
            ask for same-day feasibility before you pay.
          </p>
        </>
      )}
    </>
  );
}
