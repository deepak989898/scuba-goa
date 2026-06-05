/** Client-safe click classification for conversion funnel (no server env). */
export type ClickCategory =
  | "whatsapp"
  | "phone"
  | "book_cta"
  | "service_cta"
  | "other";

export function classifyClick(
  href: string,
  label: string,
  el?: Element | null,
): ClickCategory {
  const h = href.trim().toLowerCase();
  const text = label.trim().toLowerCase();

  if (h.includes("wa.me") || text.includes("whatsapp")) return "whatsapp";
  if (h.startsWith("tel:") || text.includes("call")) return "phone";
  if (h.includes("/booking") || h.endsWith("/booking")) return "book_cta";

  const dataAttr = el?.getAttribute("data-analytics-click")?.toLowerCase() ?? "";
  if (dataAttr === "book" || dataAttr === "booking") return "book_cta";

  if (
    /book\s*now|reserve|pay\s*now|checkout|add to cart/i.test(text) ||
    /book\s*now|reserve|pay\s*now/i.test(h)
  ) {
    return "book_cta";
  }

  if (h.startsWith("/services/") || h === "/services") return "service_cta";

  return "other";
}
