import { NextResponse } from "next/server";
import { upsertBookWithUsChatSession } from "@/lib/chat-booking-agent/session-log-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      sessionId?: string;
      language?: string;
      messages?: Array<{ role?: string; text?: string; at?: string; step?: string }>;
      step?: string;
      tripDate?: string;
      people?: number;
      pickup?: string;
      selectedPackages?: string[];
      customerName?: string;
      phone?: string;
      email?: string;
      cartTotalInr?: number;
      paidInr?: number;
      converted?: boolean;
      paymentId?: string;
    };

    const sessionId = String(body.sessionId ?? "").trim().slice(0, 128);
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const messages = Array.isArray(body.messages)
      ? body.messages
          .filter((m) => m && (m.role === "user" || m.role === "assistant"))
          .map((m) => ({
            role: m.role as "user" | "assistant",
            text: String(m.text ?? "").slice(0, 4000),
            at: String(m.at ?? new Date().toISOString()),
            step: m.step ? String(m.step) : undefined,
          }))
      : [];

    await upsertBookWithUsChatSession({
      sessionId,
      language: String(body.language ?? "English").slice(0, 40),
      messages,
      step: String(body.step ?? "welcome").slice(0, 32),
      tripDate: body.tripDate ? String(body.tripDate).slice(0, 32) : undefined,
      people:
        typeof body.people === "number" && body.people > 0
          ? Math.floor(body.people)
          : undefined,
      pickup: body.pickup ? String(body.pickup).slice(0, 200) : undefined,
      selectedPackages: Array.isArray(body.selectedPackages)
        ? body.selectedPackages.map((s) => String(s).slice(0, 200)).slice(0, 30)
        : undefined,
      customerName: body.customerName
        ? String(body.customerName).slice(0, 120)
        : undefined,
      phone: body.phone ? String(body.phone).slice(0, 20) : undefined,
      email: body.email ? String(body.email).slice(0, 120) : undefined,
      cartTotalInr:
        typeof body.cartTotalInr === "number" ? body.cartTotalInr : undefined,
      paidInr: typeof body.paidInr === "number" ? body.paidInr : undefined,
      converted: Boolean(body.converted),
      paymentId: body.paymentId ? String(body.paymentId).slice(0, 80) : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[chat/booking-session]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 },
    );
  }
}
