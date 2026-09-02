import { createHmac, timingSafeEqual } from "crypto";
import { after, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { FieldValue } from "firebase-admin/firestore";
import { generateBillPdf } from "@/lib/billPdf";
import { buildPackageLinesForBill, normalizePickupLocation } from "@/lib/billPackageLines";
import {
  sendBookingAdminNotificationEmail,
  sendBookingConfirmationEmailDetailed,
} from "@/lib/email";
import { createBookingBillShareToken } from "@/lib/bookingBillShareToken";
import { getAdminDb } from "@/lib/firebase-admin";
import { getPublicBaseUrl } from "@/lib/publicRequestOrigin";
import { upsertRecoveryLead } from "@/lib/recovery-agent/lead-tracker";
import type { CartItemForPromo } from "@/lib/promo-pricing";
import { isValidPayAmountPaise } from "@/lib/payment";
import {
  describeSmsConfig,
  isSmsConfigured,
  sendBookingConfirmationSms,
} from "@/lib/sms";
import { validatePromoForOrder } from "@/lib/validate-promo-for-order";

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
  /** Optional single online promo (must match server recomputation). */
  promoCode?: string;
  discountPercent?: number;
  subtotalBeforeDiscountPaise?: number;
  channel?: string;
};

function parseCartItemsForPromo(raw: unknown): CartItemForPromo[] | null {
  if (!Array.isArray(raw)) return null;
  const out: CartItemForPromo[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") return null;
    const o = row as Record<string, unknown>;
    out.push({
      unitPrice: Number(o.unitPrice),
      quantity: Number(o.quantity),
    });
  }
  return out;
}

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

  const promoRaw =
    typeof booking.promoCode === "string" ? booking.promoCode.trim() : "";

  if (hasStructured) {
    if (!Number.isFinite(fullAmountPaise) || fullAmountPaise < 100) {
      return NextResponse.json(
        { error: "Invalid booking totals" },
        { status: 400 }
      );
    }
    if (promoRaw) {
      const items = parseCartItemsForPromo(booking.cartItems);
      if (!items?.length) {
        return NextResponse.json(
          { error: "Promo bookings require a valid cart on the server." },
          { status: 400 }
        );
      }
      const vr = await validatePromoForOrder({
        promoCodeRaw: promoRaw,
        cartItems: items,
        payUnits,
        claimedFullAmountPaise: fullAmountPaise,
        claimedChargePaise: paidPaise,
      });
      if (!vr.ok) {
        return NextResponse.json(
          { error: vr.error === "NO_PROMO" ? "Invalid promo." : vr.error },
          { status: 400 }
        );
      }
    } else if (!isValidPayAmountPaise(paidPaise, fullAmountPaise, payUnits)) {
      return NextResponse.json(
        { error: "Paid amount does not match allowed minimum or full total" },
        { status: 400 }
      );
    }
  } else {
    if (promoRaw) {
      return NextResponse.json(
        { error: "This payment shape does not support promo codes." },
        { status: 400 }
      );
    }
    fullAmountPaise = paidPaise;
  }

  const balancePaise = Math.max(0, fullAmountPaise - paidPaise);
  const paymentMode = balancePaise > 0 ? "partial" : "full";
  const amountInr = Math.round(paidPaise / 100);
  const fullInr = Math.round(fullAmountPaise / 100);
  const balanceInr = Math.round(balancePaise / 100);

  const shareToken = createBookingBillShareToken(razorpay_payment_id);
  const baseUrl = getPublicBaseUrl(req);
  const invoiceDownloadUrl = shareToken
    ? `${baseUrl}/api/booking-bill-share?token=${encodeURIComponent(shareToken)}&download=1`
    : undefined;

  const clientConfirm = {
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
    paymentMode,
    paidInr: amountInr,
    balanceInr,
    fullInr,
    packageName: String(booking.packageName ?? ""),
    invoiceDownloadUrl,
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
    // Critical path: persist booking so invoice download works, then return fast.
    await ref.set({
      ...payload,
      invoiceShareCreated: Boolean(shareToken),
      notificationsPending: true,
    });
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

  const leadPhone = normalizePhone(booking.phone);
  const packageName = String(booking.packageName);
  const customerName = String(booking.customerName);
  const customerEmail = String(booking.email).trim();
  const phone = String(booking.phone);
  const date = String(booking.date);
  const people = Number(booking.people) || 0;
  const pickupLocation =
    typeof booking.pickupLocation === "string"
      ? booking.pickupLocation
      : undefined;
  const bookingChannel =
    typeof booking.channel === "string" ? booking.channel.trim() : undefined;

  // 1) Customer email first (Resend + invoice link) — do not wait for PDF.
  let emailSent = false;
  let emailError: string | undefined;
  try {
    const mail = await sendBookingConfirmationEmailDetailed({
      to: customerEmail,
      customerName,
      packageName,
      date,
      people,
      amountInr,
      fullAmountInr: fullInr,
      balanceInr,
      paymentId: razorpay_payment_id,
      invoiceUrl: invoiceDownloadUrl,
    });
    emailSent = mail.ok;
    if (!mail.ok) {
      emailError = mail.error || `send failed via ${mail.transport}`;
      console.error("booking confirmation email failed", {
        to: customerEmail,
        transport: mail.transport,
        error: emailError,
      });
    }
  } catch (err) {
    emailError = err instanceof Error ? err.message : String(err);
    console.error("booking confirmation email threw", err);
  }

  try {
    await ref.set(
      {
        emailSent,
        emailError: emailError ?? null,
        emailTransport: process.env.RESEND_API_KEY?.trim() ? "resend" : "smtp",
        notificationsPending: true,
        invoiceShareCreated: Boolean(shareToken),
      },
      { merge: true },
    );
  } catch {
    /* non-blocking */
  }

  // 2) PDF, admin email, SMS, CRM writes continue after the browser redirects.
  after(async () => {
    try {
      await Promise.all([
        leadPhone
          ? db
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
                { merge: true },
              )
          : Promise.resolve(),
        db.collection("paymentEvents").add({
          eventType: "payment_success",
          amountPaise: paidPaise,
          razorpayOrderId: razorpay_order_id,
          path: "/booking",
          createdAt: FieldValue.serverTimestamp(),
        }),
        upsertRecoveryLead({
          phone: leadPhone,
          name: customerName,
          email: customerEmail,
          path: "/booking",
          event: "payment_success",
          amountPaise: paidPaise,
        }).catch(() => undefined),
      ]);
    } catch (err) {
      console.error("post-booking side writes failed", err);
    }

    let pdfBytes: Uint8Array | undefined;
    try {
      pdfBytes = await generateBillPdf({
        customerName,
        customerEmail,
        phone,
        packageName,
        packageLines: buildPackageLinesForBill({
          packageName,
          people: booking.people,
          payUnits: booking.payUnits,
          cartItems: booking.cartItems,
        }),
        pickupLocation: normalizePickupLocation(booking.pickupLocation),
        date,
        people,
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

    // If the fast email failed, retry once after PDF is ready (with link + attachment).
    let emailSentFinal = emailSent;
    let emailErrorFinal = emailError;
    if (!emailSentFinal) {
      try {
        const retry = await sendBookingConfirmationEmailDetailed({
          to: customerEmail,
          customerName,
          packageName,
          date,
          people,
          amountInr,
          fullAmountInr: fullInr,
          balanceInr,
          paymentId: razorpay_payment_id,
          pdfBytes,
          invoiceUrl: invoiceDownloadUrl,
        });
        emailSentFinal = retry.ok;
        emailErrorFinal = retry.ok
          ? undefined
          : retry.error || `retry failed via ${retry.transport}`;
      } catch (err) {
        emailErrorFinal = err instanceof Error ? err.message : String(err);
      }
    }

    let adminEmailSent = false;
    try {
      adminEmailSent = await sendBookingAdminNotificationEmail({
        customerName,
        customerEmail,
        phone,
        packageName,
        date,
        people,
        amountInr,
        fullAmountInr: fullInr,
        balanceInr,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        paymentMode,
        pickupLocation,
        cartItems: booking.cartItems,
        pdfBytes,
        channel: bookingChannel,
      });
    } catch (err) {
      console.error("admin booking notification email failed", err);
    }

    let smsSent = false;
    if (invoiceDownloadUrl && isSmsConfigured()) {
      try {
        smsSent = await sendBookingConfirmationSms({
          phone,
          customerName,
          packageName,
          date,
          people,
          paidInr: amountInr,
          paymentId: razorpay_payment_id,
          invoiceUrl: invoiceDownloadUrl,
          balanceInr,
        });
      } catch (err) {
        console.error("booking confirmation SMS failed", err);
      }
    } else if (!isSmsConfigured()) {
      console.warn("SMS skipped:", describeSmsConfig());
    }

    try {
      await ref.set(
        {
          emailSent: emailSentFinal,
          emailError: emailErrorFinal ?? null,
          adminEmailSent,
          smsSent,
          notificationsPending: false,
          invoiceShareCreated: Boolean(shareToken),
        },
        { merge: true },
      );
    } catch (err) {
      console.error("booking notify flags update failed", err);
    }
  });

  return NextResponse.json({
    ok: true,
    stored: true,
    emailSent,
    emailError: emailError ?? null,
    adminEmailSent: false,
    smsSent: false,
    notificationsQueued: true,
    ...clientConfirm,
  });
}
