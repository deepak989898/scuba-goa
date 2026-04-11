import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { FieldValue } from "firebase-admin/firestore";
import { generateBillPdf } from "@/lib/billPdf";
import { buildPackageLinesForBill, normalizePickupLocation } from "@/lib/billPackageLines";
import {
  sendBookingAdminNotificationEmail,
  sendBookingConfirmationEmail,
} from "@/lib/email";
import { getAdminDb } from "@/lib/firebase-admin";
import { isValidPayAmountPaise } from "@/lib/payment";

type BookingBody = Record<string, unknown> & {
  packageId: string;
  packageName: string;
  customerName: string;
  email: string;
  phone: string;
  date: string;
  people: number;
  amountPaise: number;
  /** Total booking value before partial pay (paise). */
  fullAmountPaise?: number;
  /** People or cart units for minimum calculation. */
  payUnits?: number;
  cartItems?: unknown[];
  pickupLocation?: string;
};

function normalizePhone(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "";
  const d = s.replace(/\D/g, "");
  if (d.length < 10) return "";
  if (d.length > 12) return d.slice(-12);
  return d;
}

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!secret || !keyId) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
  }
  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    booking?: BookingBody;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking } =
    body;
  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !booking
  ) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const hmac = createHmac("sha256", secret);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = hmac.digest("hex");
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(razorpay_signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const rzp = new Razorpay({ key_id: keyId, key_secret: secret });
  let paidPaise: number;
  try {
    const payment = (await rzp.payments.fetch(razorpay_payment_id)) as {
      amount?: number;
      order_id?: string;
      status?: string;
    };
    if (payment.order_id && payment.order_id !== razorpay_order_id) {
      return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
    }
    const amt = Number(payment.amount);
    if (!Number.isFinite(amt) || amt < 100) {
      return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
    }
    const st = String(payment.status ?? "").toLowerCase();
    if (st === "failed") {
      return NextResponse.json(
        { error: "This payment failed in Razorpay. Start checkout again if you were charged." },
        { status: 400 }
      );
    }
    paidPaise = Math.round(amt);
  } catch (e) {
    console.error("Razorpay payment fetch failed", e);
    return NextResponse.json(
      { error: "Could not verify payment with Razorpay" },
      { status: 502 }
    );
  }

  const fullPaiseRaw = booking.fullAmountPaise;
  const payUnitsRaw = booking.payUnits ?? booking.people;
  const hasStructured =
    fullPaiseRaw !== undefined &&
    fullPaiseRaw !== null &&
    payUnitsRaw !== undefined &&
    payUnitsRaw !== null;

  let fullAmountPaise = Math.floor(Number(fullPaiseRaw));
  const payUnits = Math.max(1, Math.floor(Number(payUnitsRaw)));

  if (hasStructured) {
    if (!Number.isFinite(fullAmountPaise) || fullAmountPaise < 100) {
      return NextResponse.json(
        { error: "Invalid booking totals" },
        { status: 400 }
      );
    }
    if (!isValidPayAmountPaise(paidPaise, fullAmountPaise, payUnits)) {
      return NextResponse.json(
        { error: "Paid amount does not match allowed minimum or full total" },
        { status: 400 }
      );
    }
  } else {
    fullAmountPaise = paidPaise;
  }

  const balancePaise = Math.max(0, fullAmountPaise - paidPaise);
  const paymentMode = balancePaise > 0 ? "partial" : "full";
  const amountInr = Math.round(paidPaise / 100);
  const fullInr = Math.round(fullAmountPaise / 100);
  const balanceInr = Math.round(balancePaise / 100);

  const clientConfirm = {
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
    paymentMode,
    paidInr: amountInr,
    balanceInr,
    fullInr,
  };

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({
      ok: true,
      stored: false,
      emailSent: false,
      ...clientConfirm,
      warning:
        "FIREBASE_SERVICE_ACCOUNT_KEY is missing or invalid on the server. Razorpay payment succeeded, but the booking was not saved. Add the service account JSON to Vercel (or your host) and redeploy.",
    });
  }

  const ref = db.collection("bookings").doc(razorpay_payment_id);
  const payload = {
    ...booking,
    amountPaise: paidPaise,
    fullAmountPaise,
    payUnits,
    balancePaise,
    paymentMode,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    status: "paid",
    createdAt: new Date().toISOString(),
  };

  try {
    await ref.set(payload);
    const leadPhone = normalizePhone(booking.phone);
    if (leadPhone) {
      await db
        .collection("marketingLeads")
        .doc(leadPhone)
        .set(
          {
            converted: true,
            status: "booked",
            bookingId: razorpay_payment_id,
            convertedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }
  } catch (e) {
    console.error("bookings write failed", e);
    return NextResponse.json(
      {
        error:
          "Payment verified but saving the booking failed. Contact support with your Razorpay payment ID.",
        stored: false,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      },
      { status: 500 }
    );
  }

  let pdfBytes: Uint8Array | undefined;
  try {
    pdfBytes = await generateBillPdf({
      customerName: String(booking.customerName),
      customerEmail: String(booking.email).trim(),
      phone: String(booking.phone),
      packageName: String(booking.packageName),
      packageLines: buildPackageLinesForBill({
        packageName: String(booking.packageName),
        people: booking.people,
        payUnits: booking.payUnits,
        cartItems: booking.cartItems,
      }),
      pickupLocation: normalizePickupLocation(booking.pickupLocation),
      date: String(booking.date),
      people: Number(booking.people) || 0,
      amountPaidInr: amountInr,
      fullAmountInr: fullInr,
      balanceInr,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      isPartial: paymentMode === "partial",
    });
  } catch (err) {
    console.error("PDF bill generation failed", err);
  }

  let emailSent = false;
  let adminEmailSent = false;
  try {
    emailSent = await sendBookingConfirmationEmail({
      to: String(booking.email).trim(),
      customerName: String(booking.customerName),
      packageName: String(booking.packageName),
      date: String(booking.date),
      people: Number(booking.people) || 0,
      amountInr,
      fullAmountInr: fullInr,
      balanceInr,
      paymentId: razorpay_payment_id,
      pdfBytes,
    });
  } catch (err) {
    console.error("booking confirmation email failed", err);
  }

  try {
    adminEmailSent = await sendBookingAdminNotificationEmail({
      customerName: String(booking.customerName),
      customerEmail: String(booking.email).trim(),
      phone: String(booking.phone),
      packageName: String(booking.packageName),
      date: String(booking.date),
      people: Number(booking.people) || 0,
      amountInr,
      fullAmountInr: fullInr,
      balanceInr,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      paymentMode,
      pickupLocation:
        typeof booking.pickupLocation === "string"
          ? booking.pickupLocation
          : undefined,
      cartItems: booking.cartItems,
      pdfBytes,
    });
  } catch (err) {
    console.error("admin booking notification email failed", err);
  }

  const emailWarning = emailSent
    ? undefined
    : "Payment is successful, but confirmation email was not sent. Check RESEND_API_KEY and RESEND_FROM_EMAIL (use a verified sender like support@bookscubagoa.com).";

  const adminEmailWarning =
    process.env.RESEND_API_KEY && !adminEmailSent
      ? "Business inbox notification failed (check BOOKING_ADMIN_NOTIFY_EMAIL, Resend, and that support@bookscubagoa.com can receive mail)."
      : undefined;

  return NextResponse.json({
    ok: true,
    stored: true,
    emailSent,
    adminEmailSent,
    warning: emailWarning,
    adminEmailWarning,
    ...clientConfirm,
  });
}
