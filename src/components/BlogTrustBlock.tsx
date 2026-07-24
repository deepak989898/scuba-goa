import Link from "next/link";

type Props = {
  publishedAt?: string;
  updatedAt: string;
  authorLabel?: string;
};

/**
 * Trust / E-E-A-T strip — compact meta row (Published · Updated · Written by).
 */
export function BlogTrustBlock({
  publishedAt,
  updatedAt,
  authorLabel = "Book Scuba Goa content team",
}: Props) {
  return (
    <aside
      className="mt-2 rounded-lg border border-ocean-100 bg-ocean-50/60 px-2.5 py-2 text-xs text-ocean-800 sm:px-3 sm:text-sm"
      aria-label="Article information"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 sm:gap-x-4">
        {publishedAt ? (
          <p>
            <span className="font-semibold text-ocean-900">Published:</span>{" "}
            {publishedAt}
          </p>
        ) : null}
        <p>
          <span className="font-semibold text-ocean-900">Last updated:</span>{" "}
          {updatedAt}
        </p>
        <p>
          <span className="font-semibold text-ocean-900">Written by:</span>{" "}
          {authorLabel}
        </p>
      </div>
      <p className="mt-1.5 border-t border-ocean-100 pt-1.5 text-[11px] leading-snug text-ocean-700 sm:text-xs">
        Dive conditions and prices can change. Confirm before booking.{" "}
        <Link href="/refund-cancellation" className="font-semibold underline">
          Cancellation policy
        </Link>
        {" · "}
        <Link href="/contact" className="font-semibold underline">
          Contact us
        </Link>
      </p>
    </aside>
  );
}
