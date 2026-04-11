import type { BillPdfInput } from "@/lib/billPdf";
import { buildPackageLinesForBill, normalizePickupLocation } from "@/lib/billPackageLines";

export type BookingConfirmationEmailFields = {
  to: string;
  customerName: string;
  packageName: string;
  date: string;
  people: number;
  amountInr: number;
  fullAmountInr: number;
  balanceInr: number;
  paymentId: string;
};

/**
 * Maps a Firestore `bookings` document (as returned from verify) into bill PDF input.
 * `docId` is the document id (Razorpay payment id).
 */
export function bookingDocToBillPdfInput(
  data: Record<string, unknown>,
  docId: string
): BillPdfInput | null {
  const paymentId = String(data.razorpayPaymentId ?? docId ?? "").trim();
  if (!paymentId) return null;

  const orderId = String(data.razorpayOrderId ?? "").trim() || paymentId;
  const customerName = String(data.customerName ?? "").trim() || "Guest";
  const customerEmail = String(data.email ?? "").trim();
  const phone = String(data.phone ?? "");
  const packageName = String(data.packageName ?? "Booking");
  const date = String(data.date ?? "");
  const people = Math.max(0, Number(data.people ?? data.payUnits ?? 0));

  const paidPaise = Math.floor(Number(data.amountPaise ?? 0));
  const fullPaise = Math.floor(Number(data.fullAmountPaise ?? paidPaise));
  const balancePaise = Math.max(
    0,
    Math.floor(Number(data.balancePaise ?? Math.max(0, fullPaise - paidPaise)))
  );

  const amountInr = Math.round(paidPaise / 100);
  const fullInr = Math.round(fullPaise / 100);
  const balanceInr = Math.round(balancePaise / 100);

  const paymentMode = String(data.paymentMode ?? "");
  const isPartial =
    paymentMode === "partial" || (balanceInr > 0 && fullInr > amountInr);

  const packageLines = buildPackageLinesForBill({
    packageName,
    people,
    payUnits: data.payUnits,
    cartItems: data.cartItems,
  });
  const pickupLocation = normalizePickupLocation(data.pickupLocation);

  return {
    customerName,
    customerEmail,
    phone,
    packageName,
    packageLines,
    pickupLocation,
    date,
    people,
    amountPaidInr: amountInr,
    fullAmountInr: fullInr,
    balanceInr,
    paymentId,
    orderId,
    isPartial,
  };
}

export function bookingDocToEmailFields(
  data: Record<string, unknown>,
  docId: string
): BookingConfirmationEmailFields | null {
  const bill = bookingDocToBillPdfInput(data, docId);
  if (!bill) return null;
  const to = String(data.email ?? "").trim();
  if (!to.includes("@")) return null;

  return {
    to,
    customerName: bill.customerName,
    packageName: bill.packageName,
    date: bill.date,
    people: bill.people,
    amountInr: bill.amountPaidInr,
    fullAmountInr: bill.fullAmountInr,
    balanceInr: bill.balanceInr,
    paymentId: bill.paymentId,
  };
}
