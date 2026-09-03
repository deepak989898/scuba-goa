import { getAdminDb } from "@/lib/firebase-admin";
import {
  GOA_DESTINATION_KEY,
  HOTEL_FIRESTORE,
  type HotelBookingDoc,
  type HotelBookingStatus,
  type HotelGuestDetails,
  type HotelPaymentStatus,
  type RoomGuestRoom,
} from "./types";

function bookingsCol() {
  const db = getAdminDb();
  if (!db) return null;
  return db.collection(HOTEL_FIRESTORE.bookings);
}

export function generateHotelBookingId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `HB${t}${r}`.toUpperCase();
}

export type CreateHotelBookingInput = {
  tjHotelId: string;
  hotelName: string;
  locality?: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  roomName?: string;
  mealBasis?: string;
  totalFare: number;
  currency: string;
  guestDetails: HotelGuestDetails;
  roomGuestRooms: RoomGuestRoom[];
  tripjackReviewBookingId?: string;
  reviewNormalized?: Record<string, unknown>;
  status?: HotelBookingStatus;
  paymentStatus?: HotelPaymentStatus;
};

export async function createHotelBooking(
  input: CreateHotelBookingInput,
): Promise<HotelBookingDoc> {
  const col = bookingsCol();
  if (!col) throw new Error("Database not configured");

  const id = generateHotelBookingId();
  const now = new Date().toISOString();
  const doc: HotelBookingDoc = {
    id,
    bookingId: id,
    productType: "hotel",
    destinationKey: GOA_DESTINATION_KEY,
    tjHotelId: input.tjHotelId,
    hotelName: input.hotelName,
    locality: input.locality,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    rooms: input.rooms,
    adults: input.adults,
    children: input.children,
    roomName: input.roomName,
    mealBasis: input.mealBasis,
    totalFare: Math.round(input.totalFare),
    currency: input.currency || "INR",
    guestDetails: input.guestDetails,
    roomGuestRooms: input.roomGuestRooms,
    status: input.status ?? "review_confirmed",
    paymentStatus: input.paymentStatus ?? "pending",
    tripjackReviewBookingId: input.tripjackReviewBookingId,
    reviewNormalized: input.reviewNormalized,
    manualReviewResolved: false,
    createdAt: now,
    updatedAt: now,
  };

  await col.doc(id).set(doc);
  return doc;
}

export async function getHotelBooking(id: string): Promise<HotelBookingDoc | null> {
  const col = bookingsCol();
  if (!col) return null;
  const snap = await col.doc(id).get();
  if (!snap.exists) return null;
  return snap.data() as HotelBookingDoc;
}

export async function updateHotelBooking(
  id: string,
  patch: Partial<HotelBookingDoc>,
): Promise<void> {
  const col = bookingsCol();
  if (!col) throw new Error("Database not configured");
  await col.doc(id).set(
    {
      ...patch,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function listHotelBookings(opts?: {
  status?: HotelBookingStatus;
  limit?: number;
}): Promise<HotelBookingDoc[]> {
  const col = bookingsCol();
  if (!col) return [];

  const limit = Math.min(200, Math.max(1, opts?.limit ?? 100));
  const snap = await col.orderBy("createdAt", "desc").limit(limit).get();
  let rows = snap.docs.map((d) => d.data() as HotelBookingDoc);
  if (opts?.status) {
    rows = rows.filter((b) => b.status === opts.status);
  }
  return rows;
}

export async function markHotelBookingPaid(
  id: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
): Promise<void> {
  await updateHotelBooking(id, {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignatureVerified: true,
    paymentStatus: "paid",
    status: "pending_admin_confirmation",
  });
}

export async function markHotelBookingConfirmed(
  id: string,
  supplierConfirmation?: string,
  adminNotes?: string,
): Promise<void> {
  await updateHotelBooking(id, {
    status: "confirmed",
    manualReviewResolved: true,
    supplierConfirmation: supplierConfirmation?.trim() || undefined,
    adminNotes: adminNotes?.trim() || undefined,
  });
}
