const TZ = "Asia/Kolkata";

/** YYYY-MM-DD in IST. */
export function istDateString(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Previous calendar day in IST. */
export function istYesterdayString(d = new Date()): string {
  const yesterday = new Date(d.getTime() - 86400000);
  return istDateString(yesterday);
}

/** UTC Date bounds for one IST calendar day (inclusive). */
export function istDayUtcBounds(dateIst: string): { start: Date; end: Date } {
  const start = new Date(`${dateIst}T00:00:00+05:30`);
  const end = new Date(`${dateIst}T23:59:59.999+05:30`);
  return { start, end };
}
