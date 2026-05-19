export type IstTimeParts = {
  date: string;
  hour: number;
  minute: number;
  totalMinutes: number;
};

/** Current calendar date + clock in Asia/Kolkata. */
export function getIstNow(): IstTimeParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  return {
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    hour,
    minute,
    totalMinutes: hour * 60 + minute,
  };
}

export function parseSlotToMinutes(slot: string): number | null {
  const m = slot.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function formatSlotFromMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function defaultSlotsForCount(count: number): string[] {
  const n = Math.min(5, Math.max(1, count));
  if (n === 1) return ["09:00"];
  const start = 9 * 60;
  const end = 20 * 60;
  const step = Math.floor((end - start) / (n - 1));
  const slots: string[] = [];
  for (let i = 0; i < n; i += 1) {
    slots.push(formatSlotFromMinutes(start + step * i));
  }
  return slots;
}

export function normalizePublishSlotsIst(
  postsPerDay: number,
  raw?: unknown,
  legacyHour?: number,
): string[] {
  const count = Math.min(5, Math.max(1, postsPerDay));
  let slots: string[] = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const s = String(item).trim();
      if (parseSlotToMinutes(s) != null) slots.push(s);
    }
  }

  if (slots.length === 0 && legacyHour != null) {
    slots = [formatSlotFromMinutes(legacyHour * 60)];
  }

  if (slots.length === 0) {
    slots = defaultSlotsForCount(count);
  }

  slots = slots
    .map((s) => {
      const mins = parseSlotToMinutes(s);
      return mins != null ? formatSlotFromMinutes(mins) : null;
    })
    .filter((s): s is string => s != null);

  while (slots.length < count) {
    const defaults = defaultSlotsForCount(count);
    const next = defaults[slots.length];
    if (next && !slots.includes(next)) slots.push(next);
    else slots.push(formatSlotFromMinutes(9 * 60 + slots.length * 180));
  }

  return slots.slice(0, count).sort((a, b) => {
    const am = parseSlotToMinutes(a) ?? 0;
    const bm = parseSlotToMinutes(b) ?? 0;
    return am - bm;
  });
}

export function isSlotDueInWindow(
  slot: string,
  now: IstTimeParts,
  windowMinutes = 30,
): boolean {
  const slotMins = parseSlotToMinutes(slot);
  if (slotMins == null) return false;
  return (
    now.totalMinutes >= slotMins &&
    now.totalMinutes < slotMins + windowMinutes
  );
}
