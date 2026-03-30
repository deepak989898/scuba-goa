import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

const NAME_MAX = 80;
const PHONE_MAX = 20;
const ITEM_MAX = 120;
const DATE_MAX = 24;
const SESSION_MAX = 128;

function cleanPhone(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "";
  const d = s.replace(/\D/g, "");
  if (d.length < 10) return "";
  if (d.length > 12) return d.slice(-12);
  return d;
}

export async function POST(req: Request) {
  const db = getAdminDb();
  if (!db) return new NextResponse(null, { status: 204 });

  let body: {
    name?: string;
    phone?: string;
    interestedItem?: string;
    preferredDate?: string;
    sessionId?: string;
    source?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = cleanPhone(body.phone);
  if (!phone) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });

  const name =
    typeof body.name === "string" ? body.name.trim().slice(0, NAME_MAX) : "";
  const interestedItem =
    typeof body.interestedItem === "string"
      ? body.interestedItem.trim().slice(0, ITEM_MAX)
      : "";
  const preferredDate =
    typeof body.preferredDate === "string"
      ? body.preferredDate.trim().slice(0, DATE_MAX)
      : "";
  const sessionId =
    typeof body.sessionId === "string"
      ? body.sessionId.trim().slice(0, SESSION_MAX)
      : "";
  const source = typeof body.source === "string" ? body.source.trim() : "website";

  try {
    const ref = db.collection("marketingLeads").doc(phone);
    await ref.set(
      {
        phone,
        name,
        interestedItem,
        preferredDate,
        sessionId,
        source: source || "website",
        status: "intent",
        converted: false,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.error("marketing lead write failed", e);
    return NextResponse.json({ error: "Lead save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

