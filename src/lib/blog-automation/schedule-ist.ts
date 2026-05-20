import { parseSlotToMinutes } from "@/lib/blog-automation/schedule-utils";

/** `YYYY-MM-DD` + `HH:mm` (IST) → UTC ISO string for Firestore. */
export function istSlotToUtcIso(dateIst: string, slot: string): string {
  const mins = parseSlotToMinutes(slot);
  if (mins == null) throw new Error(`Invalid IST slot: ${slot}`);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const isoIst = `${dateIst}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+05:30`;
  return new Date(isoIst).toISOString();
}

export function formatUtcInIst(
  iso: string | undefined | null,
  style: "short" | "long" = "short",
): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: style === "long" ? "medium" : "short",
    timeStyle: "short",
  }).format(d);
}

/** Value for `<input type="datetime-local">` in IST. */
export function utcIsoToIstDatetimeLocalValue(iso: string | undefined | null): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function istDatetimeLocalValueToUtcIso(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const normalized = v.includes("T") ? v : v.replace(" ", "T");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized)) return null;
  const isoIst = `${normalized}:00+05:30`;
  const d = new Date(isoIst);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
