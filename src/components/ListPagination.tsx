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
};

export function ListPagination({
  basePath,
  page,
  totalPages,
  totalItems,
  start,
  end,
  itemLabel,
}: Props) {
  if (totalItems === 0) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  const pageNumbers: number[] = [];
  const window = 2;
  const from = Math.max(1, page - window);
  const to = Math.min(totalPages, page + window);
  for (let i = from; i <= to; i++) pageNumbers.push(i);

  return (
    <nav
      className="mt-6 flex flex-col gap-3 border-t border-ocean-100 pt-5 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Pagination"
    >
      <p className="text-sm text-ocean-600">
        Showing {start + 1}–{end} of {totalItems} {itemLabel}
        {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : null}
      </p>

      {totalPages > 1 ? (
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

          {from > 1 ? (
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
            n === page ? (
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

          {to < totalPages ? (
            <>
              {to < totalPages - 1 ? (
                <span className="px-1 text-ocean-400" aria-hidden>
                  …
                </span>
              ) : null}
              <Link
                href={pageHref(basePath, totalPages)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ocean-200 bg-white text-sm font-semibold text-ocean-800 hover:border-ocean-400"
              >
                {totalPages}
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
          ) : (
            <span className="inline-flex min-h-10 items-center rounded-full border border-ocean-100 px-3.5 py-2 text-sm text-ocean-400">
              Next →
            </span>
          )}
        </div>
      ) : null}
    </nav>
  );
}
