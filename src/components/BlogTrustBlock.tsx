import Link from "next/link";

type Props = {
  publishedAt?: string;
  updatedAt: string;
  authorLabel?: string;
  reviewerLabel?: string;
};

/**
 * Trust / E-E-A-T strip — truthful labels only (no fake certifications).
 */
export function BlogTrustBlock({
  publishedAt,
  updatedAt,
  authorLabel = "Book Scuba Goa content team",
  reviewerLabel = "Reviewed by the Book Scuba Goa content team",
}: Props) {
  return (
    <aside
      className="mt-4 rounded-xl border border-ocean-100 bg-ocean-50/60 px-3 py-3 text-sm text-ocean-800 sm:px-4"
      aria-label="Article information"
    >
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm">
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
      </div>
      <p className="mt-1.5 text-xs sm:text-sm">
        <span className="font-semibold text-ocean-900">Written by:</span>{" "}
        {authorLabel}
      </p>
      <p className="mt-0.5 text-xs sm:text-sm">
        <span className="font-semibold text-ocean-900">Review:</span>{" "}
        {reviewerLabel}
      </p>
      <p className="mt-2 border-t border-ocean-100 pt-2 text-xs leading-relaxed text-ocean-700">
        Dive conditions, visibility, schedules and prices can change with weather,
        season and operator availability. Confirm current details before booking.{" "}
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
