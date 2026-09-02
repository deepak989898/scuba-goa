import type { PickOption } from "./types";

export function slotSummary(
  options: PickOption[],
  people: number,
): { ok: boolean; lines: string[] } {
  const lines: string[] = [];
  let ok = true;

  for (const opt of options) {
    const slots = opt.slotsLeft;
    if (slots == null) continue;
    if (slots <= 0) {
      ok = false;
      lines.push(`${opt.title}: no slots listed — we'll confirm on call`);
    } else if (slots < people) {
      ok = false;
      lines.push(`${opt.title}: only ${slots} slots left (you need ${people})`);
    } else if (slots <= people + 2) {
      lines.push(`${opt.title}: ${slots} slots left — book soon`);
    }
  }

  if (lines.length === 0) {
    lines.push("Slots available for your group");
  }

  return { ok, lines };
}
