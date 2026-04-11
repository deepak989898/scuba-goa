/**
 * Human-readable package/cart lines for bills and receipts.
 * Cart `quantity` is typically persons or slots per line; `lineTotal` is INR (not paise).
 */
export function buildPackageLinesForBill(booking: {
  packageName: string;
  people?: unknown;
  payUnits?: unknown;
  cartItems?: unknown;
}): string[] {
  const people = Math.max(
    0,
    Math.floor(Number(booking.people ?? booking.payUnits ?? 0))
  );
  const pkg = String(booking.packageName ?? "Booking").trim() || "Booking";
  const cart = booking.cartItems;
  if (Array.isArray(cart) && cart.length > 0) {
    const lines: string[] = [];
    for (const raw of cart) {
      if (!raw || typeof raw !== "object") continue;
      const o = raw as Record<string, unknown>;
      const name = String(o.name ?? "Item").trim() || "Item";
      const q = Math.max(1, Math.floor(Number(o.quantity) || 1));
      const lt = Number(o.lineTotal);
      const totalInr = Number.isFinite(lt) ? Math.round(lt) : null;
      if (totalInr !== null) {
        lines.push(
          `${name} — ${q} person(s) — Rs.${totalInr.toLocaleString("en-IN")} (line total)`
        );
      } else {
        lines.push(`${name} — ${q} person(s)`);
      }
    }
    if (lines.length > 0) return lines.slice(0, 14);
  }
  return [pkg, `Total persons / units for this booking: ${people}`];
}

export function normalizePickupLocation(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return t.length ? t : undefined;
}
