/** Shared list pagination for /blog and /guides indexes. */

export const LIST_PAGE_SIZE = 12;

export type PageSlice = {
  page: number;
  totalPages: number;
  totalItems: number;
  start: number;
  end: number;
};

export function parseListPage(raw: string | string[] | undefined): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(String(v ?? "1"), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export function getPageSlice(
  totalItems: number,
  pageRaw: string | string[] | undefined,
  pageSize = LIST_PAGE_SIZE,
): PageSlice {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(parseListPage(pageRaw), totalPages);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, totalItems);
  return { page, totalPages, totalItems, start, end };
}

export function pageHref(basePath: string, page: number): string {
  if (page <= 1) return basePath;
  return `${basePath}?page=${page}`;
}
