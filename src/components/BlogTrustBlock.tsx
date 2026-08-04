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
      className="rounded-md border border-ocean-100 bg-ocean-50/60 px-2 py-1.5 text-[11px] text-ocean-800 sm:text-xs"
      aria-label="Article information"
    >
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0">
        {publishedAt ? (
          <p>
            <span className="font-semibold text-ocean-900">Published:</span>{" "}
            {publishedAt}
          </p>
        ) : null}
        <p>
          <span className="font-semibold text-ocean-900">Updated:</span>{" "}
          {updatedAt}
        </p>
        <p>
          <span className="font-semibold text-ocean-900">By:</span>{" "}
          {authorLabel}
        </p>
      </div>
      <p className="mt-1 border-t border-ocean-100 pt-1 text-[10px] leading-snug text-ocean-700 sm:text-[11px]">
        Conditions and prices can change.{" "}
        <Link href="/refund-cancellation" className="font-semibold underline">
          Cancellation
        </Link>
        {" · "}
        <Link href="/contact" className="font-semibold underline">
          Contact
        </Link>
      </p>
    </aside>
  );
}
