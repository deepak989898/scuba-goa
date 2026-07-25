import Link from "next/link";
import { pageHref } from "@/lib/list-pagination";

type Props = {
  basePath: string;
  page: number;
  totalPages: number;
  totalItems: number;
  start: number;
  end: number;
  itemLabel: string;
  /** Hide “Showing X–Y of Z · Page N of M” status text */
  hideStatus?: boolean;
  /** Cap visible page links + Next (e.g. 3 = only pages 1–3) */
  maxPages?: number;
};

export function ListPagination({
  basePath,
  page,
  totalPages,
  totalItems,
  start,
  end,
  itemLabel,
  hideStatus = false,
  maxPages,
}: Props) {
  if (totalItems === 0) return null;

  const cappedTotalPages =
    maxPages != null && maxPages > 0
      ? Math.min(totalPages, maxPages)
      : totalPages;
  const currentPage = Math.min(page, cappedTotalPages);

  const prev = currentPage > 1 ? currentPage - 1 : null;
  const next = currentPage < cappedTotalPages ? currentPage + 1 : null;

  const pageNumbers: number[] = [];
  if (maxPages != null && maxPages > 0) {
    for (let i = 1; i <= cappedTotalPages; i++) pageNumbers.push(i);
  } else {
    const window = 2;
    const from = Math.max(1, currentPage - window);
    const to = Math.min(cappedTotalPages, currentPage + window);
    for (let i = from; i <= to; i++) pageNumbers.push(i);
  }

  const from = pageNumbers[0] ?? 1;
  const to = pageNumbers[pageNumbers.length - 1] ?? cappedTotalPages;
  const useWindow = maxPages == null;

  return (
    <nav
      className={`mt-6 flex flex-col gap-3 border-t border-ocean-100 pt-5 ${
        hideStatus
          ? "sm:flex-row sm:items-center sm:justify-end"
          : "sm:flex-row sm:items-center sm:justify-between"
      }`}
      aria-label="Pagination"
    >
      {!hideStatus ? (
        <p className="text-sm text-ocean-600">
          Showing {start + 1}–{end} of {totalItems} {itemLabel}
          {cappedTotalPages > 1
            ? ` · Page ${currentPage} of ${cappedTotalPages}`
            : null}
        </p>
      ) : null}

      {cappedTotalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {prev != null ? (
            <Link
              href={pageHref(basePath, prev)}
              className="inline-flex min-h-10 items-center rounded-full border border-ocean-200 bg-white px-3.5 py-2 text-sm font-semibold text-ocean-800 hover:border-ocean-400"
              rel="prev"
            >
              ← Prev
            </Link>
          ) : (
            <span className="inline-flex min-h-10 items-center rounded-full border border-ocean-100 px-3.5 py-2 text-sm text-ocean-400">
              ← Prev
            </span>
          )}

          {useWindow && from > 1 ? (
            <>
              <Link
                href={pageHref(basePath, 1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ocean-200 bg-white text-sm font-semibold text-ocean-800 hover:border-ocean-400"
              >
                1
              </Link>
              {from > 2 ? (
                <span className="px-1 text-ocean-400" aria-hidden>
                  …
                </span>
              ) : null}
            </>
          ) : null}

          {pageNumbers.map((n) =>
            n === currentPage ? (
              <span
                key={n}
                aria-current="page"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ocean-800 text-sm font-bold text-white"
              >
                {n}
              </span>
            ) : (
              <Link
                key={n}
                href={pageHref(basePath, n)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ocean-200 bg-white text-sm font-semibold text-ocean-800 hover:border-ocean-400"
              >
                {n}
              </Link>
            ),
          )}

          {useWindow && to < cappedTotalPages ? (
            <>
              {to < cappedTotalPages - 1 ? (
                <span className="px-1 text-ocean-400" aria-hidden>
                  …
                </span>
              ) : null}
              <Link
                href={pageHref(basePath, cappedTotalPages)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ocean-200 bg-white text-sm font-semibold text-ocean-800 hover:border-ocean-400"
              >
                {cappedTotalPages}
              </Link>
            </>
          ) : null}

          {next != null ? (
            <Link
              href={pageHref(basePath, next)}
              className="inline-flex min-h-10 items-center rounded-full border border-ocean-200 bg-white px-3.5 py-2 text-sm font-semibold text-ocean-800 hover:border-ocean-400"
              rel="next"
            >
              Next →
            </Link>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
