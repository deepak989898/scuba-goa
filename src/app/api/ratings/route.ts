import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

const MAX_NAME = 80;
const MAX_COMMENT = 800;
const MAX_CITY = 80;

export async function POST(req: Request) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Server not configured for reviews" },
      { status: 503 }
    );
  }

  let body: {
    authorName?: string;
    comment?: string;
    rating?: number;
    city?: string;
    website?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.website) {
    return NextResponse.json({ ok: true });
  }

  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
  }

  const authorName = String(body.authorName ?? "Guest")
    .trim()
    .slice(0, MAX_NAME);
  const comment = String(body.comment ?? "")
    .trim()
    .slice(0, MAX_COMMENT);

  if (!comment) {
    return NextResponse.json(
      { error: "Please add a short comment" },
      { status: 400 }
    );
  }

  const city = String(body.city ?? "")
    .trim()
    .slice(0, MAX_CITY);

  if (!city) {
    return NextResponse.json(
      { error: "Please enter your city" },
      { status: 400 }
    );
  }

  try {
    await db.collection("ratings").add({
      authorName: authorName || "Guest",
      comment,
      city,
      rating: Math.round(rating),
      approved: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("ratings write failed", e);
    return NextResponse.json({ error: "Could not save review" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
