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

      {s.subServices && s.subServices.length > 0 ? (
        <section className="mt-10 border-t border-ocean-100 pt-10">
          <h2 className="font-display text-xl font-bold text-ocean-900 sm:text-2xl">
            Options &amp; add-ons
          </h2>
          <p className="mt-2 text-sm text-ocean-600">
            Pick a variant or bundle—mention your choice when you book or chat.
          </p>
          <ul className="mt-6 space-y-4">
            {s.subServices.map((sub, idx) => (
              <li
                key={`${sub.title}-${idx}`}
                className="rounded-2xl border border-ocean-100 bg-ocean-50/40 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold text-ocean-900">
                    {sub.title}
                  </h3>
                  {sub.priceFrom != null && !Number.isNaN(sub.priceFrom) ? (
                    <p className="text-sm font-bold text-ocean-800">
                      From ₹{sub.priceFrom.toLocaleString("en-IN")}
                    </p>
                  ) : null}
                </div>
                {sub.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-ocean-700 whitespace-pre-line">
                    {sub.description}
                  </p>
                ) : null}
                {sub.includes && sub.includes.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {sub.includes.map((inc, j) => (
                      <li
                        key={`${idx}-${j}-${inc}`}
                        className="rounded-full bg-white px-2.5 py-0.5 text-xs text-ocean-800 ring-1 ring-ocean-100"
                      >
                        {inc}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
