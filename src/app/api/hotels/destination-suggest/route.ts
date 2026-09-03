import { NextResponse } from "next/server";
import { GOA_ALIASES, GOA_DISPLAY_NAME } from "@/lib/tripjack-hotels/goa";

/** Goa-only destination suggestions — no other cities. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const base = [
    { id: "goa", label: GOA_DISPLAY_NAME, type: "city" },
    { id: "calangute", label: "Calangute, Goa", type: "area" },
    { id: "candolim", label: "Candolim, Goa", type: "area" },
    { id: "baga", label: "Baga, Goa", type: "area" },
    { id: "anjuna", label: "Anjuna, Goa", type: "area" },
    { id: "panaji", label: "Panaji, Goa", type: "area" },
    { id: "north-goa", label: "North Goa", type: "area" },
    { id: "south-goa", label: "South Goa", type: "area" },
  ];

  const filtered = q
    ? base.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          s.id.includes(q) ||
          GOA_ALIASES.has(q),
      )
    : base;

  return NextResponse.json({
    destinationLocked: GOA_DISPLAY_NAME,
    suggestions: filtered.length ? filtered : base.slice(0, 1),
  });
}
