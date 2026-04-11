import type { Metadata } from "next";
import Link from "next/link";
import { PromoCopyButton } from "@/components/PromoCopyButton";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { fetchActiveOffersPublic } from "@/lib/server-offers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Offers & promo codes",
  description: `Online-only promo codes for ${SITE_NAME}. Copy a code and paste it on the booking page before Razorpay checkout.`,
  alternates: {
    canonical: `${SITE_URL.replace(/\/$/, "")}/offers`,
  },
};

function tierLabel(o: {
  minCartUnits?: number;
  maxCartUnits?: number | null;
}): string {
  const min = Math.max(1, Math.floor(Number(o.minCartUnits ?? 1)));
  const max = o.maxCartUnits;
  if (max != null && Number.isFinite(Number(max))) {
    return `${min}–${Math.floor(Number(max))} people / units in cart`;
  }
  return `${min}+ people / units in cart`;
}

export default async function OffersPage() {
  const offers = await fetchActiveOffersPublic();

  const byCategory = new Map<string, typeof offers>();
  for (const o of offers) {
    const c = (o.category ?? "Offers").trim() || "Offers";
    if (!byCategory.has(c)) byCategory.set(c, []);
    byCategory.get(c)!.push(o);
  }
  const groups = [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="bg-gradient-to-b from-amber-50/40 via-white to-ocean-50/30">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-800">
          Online booking only
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ocean-900 sm:text-4xl">
          Offers &amp; promo codes
        </h1>
        <p className="mt-4 text-ocean-800 sm:text-lg">
          Pick one code, copy it, then paste it on the{" "}
          <Link href="/booking" className="font-semibold text-cyan-700 underline">
            booking
          </Link>{" "}
          page before you pay with Razorpay. Only{" "}
          <strong className="text-ocean-900">one promo code</strong> applies per checkout.
          Codes do not stack.
        </p>

        {groups.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-ocean-100 bg-white p-8 text-center shadow-sm">
            <p className="text-ocean-700">
              New offers are on the way. You can still{" "}
              <Link href="/booking" className="font-semibold text-cyan-700 underline">
                book online
              </Link>{" "}
              anytime.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            {groups.map(([category, list]) => (
              <section key={category} aria-labelledby={`cat-${category}`}>
                <h2
                  id={`cat-${category}`}
                  className="font-display text-xl font-bold text-ocean-900"
                >
                  {category}
                </h2>
                <ul className="mt-4 space-y-4">
                  {list.map((o) => (
                    <li
                      key={o.id}
                      className="rounded-2xl border border-ocean-100 bg-white p-5 shadow-sm sm:flex sm:items-start sm:justify-between sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-semibold text-ocean-900">
                          {o.title}
                        </p>
                        <p className="mt-1 text-sm text-ocean-700">{o.description}</p>
                        <p className="mt-2 text-xs font-medium text-ocean-600">
                          {o.discountPercent}% off cart total · applies to: {tierLabel(o)}
                        </p>
                        <p className="mt-1 font-mono text-base font-bold tracking-wide text-cyan-800">
                          {o.promoCode}
                        </p>
                      </div>
                      <div className="mt-4 shrink-0 sm:mt-0">
                        <PromoCopyButton code={o.promoCode} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <p className="mt-12 text-center text-xs text-ocean-600">
          {SITE_NAME} — discounts apply to your online cart total before payment. Walk-in or
          WhatsApp-only deals may differ.
        </p>
      </div>
    </div>
  );
}
