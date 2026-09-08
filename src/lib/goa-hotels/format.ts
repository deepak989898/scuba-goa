export function formatHotelPriceInr(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatHotelDateLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
