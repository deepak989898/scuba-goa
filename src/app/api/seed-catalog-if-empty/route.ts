import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Deprecated public endpoint — use POST /api/admin/seed-catalog-if-empty (admin auth). */
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
