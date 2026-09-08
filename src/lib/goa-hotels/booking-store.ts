import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  GOA_HOTEL_BOOKINGS_COLLECTION,
  type GoaHotelBookingDoc,
  type GoaHotelBookingStatus,
} from "./types";

export async function createGoaHotelBooking(
  doc: GoaHotelBookingDoc,
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Database not configured");
  await db
    .collection(GOA_HOTEL_BOOKINGS_COLLECTION)
    .doc(doc.bookingId)
    .set(doc, { merge: false });
}

export async function getGoaHotelBooking(
  bookingId: string,
): Promise<GoaHotelBookingDoc | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db
    .collection(GOA_HOTEL_BOOKINGS_COLLECTION)
    .doc(bookingId)
    .get();
  if (!snap.exists) return null;
  return snap.data() as GoaHotelBookingDoc;
}

export async function listGoaHotelBookings(opts?: {
  status?: GoaHotelBookingStatus;
  limit?: number;
}): Promise<GoaHotelBookingDoc[]> {
  const db = getAdminDb();
  if (!db) return [];

  const cap = Math.min(200, Math.max(1, opts?.limit ?? 100));

  try {
    let q = db
      .collection(GOA_HOTEL_BOOKINGS_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(cap);
    if (opts?.status) {
      q = db
        .collection(GOA_HOTEL_BOOKINGS_COLLECTION)
        .where("status", "==", opts.status)
        .orderBy("createdAt", "desc")
        .limit(cap);
    }
    const snap = await q.get();
    return snap.docs.map((d) => d.data() as GoaHotelBookingDoc);
  } catch {
    const snap = await db.collection(GOA_HOTEL_BOOKINGS_COLLECTION).limit(cap * 2).get();
    let rows = snap.docs.map((d) => d.data() as GoaHotelBookingDoc);
    if (opts?.status) rows = rows.filter((b) => b.status === opts.status);
    return rows
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, cap);
  }
}

export async function updateGoaHotelBooking(
  bookingId: string,
  patch: Partial<GoaHotelBookingDoc>,
): Promise<GoaHotelBookingDoc | null> {
  const db = getAdminDb();
  if (!db) throw new Error("Database not configured");
  const ref = db.collection(GOA_HOTEL_BOOKINGS_COLLECTION).doc(bookingId);
  const now = new Date().toISOString();
  await ref.set({ ...patch, updatedAt: now }, { merge: true });
  const snap = await ref.get();
  return snap.exists ? (snap.data() as GoaHotelBookingDoc) : null;
}

export async function markGoaHotelBookingEmailSent(bookingId: string): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  await db.collection(GOA_HOTEL_BOOKINGS_COLLECTION).doc(bookingId).set(
    {
      emailSent: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
