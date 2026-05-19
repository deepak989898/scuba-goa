/** Set when the visitor has viewed any page other than `/` in this tab session. */
export const RETURNED_HOME_KEY = "bsg_visited_non_home_v1";

export function hasVisitedNonHome(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(RETURNED_HOME_KEY) === "1";
  } catch {
    return false;
  }
}

export function markVisitedNonHome(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(RETURNED_HOME_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function isHomePath(pathname: string | null | undefined): boolean {
  return pathname === "/" || pathname === "";
}
