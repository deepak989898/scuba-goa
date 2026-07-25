import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/constants";
import {
  isMailConfigured,
  resolveMailFromAddress,
  sendMailDetailed,
  type SendMailResult,
} from "@/lib/mail-transport";

/** Always BCC this address on booking confirmations (per business request). */
const DEFAULT_BOOKING_BCC = "vedrajsingh94@gmail.com";

/**
 * Inbox that receives a dedicated “new booking” email (not only BCC).
 * BCC to the same address as the From sender is often not delivered.
 */
function resolveAdminNotifyTo(): string | null {
  const raw =
    process.env.BOOKING_ADMIN_NOTIFY_EMAIL?.trim() || CONTACT_EMAIL.trim();
  return raw.includes("@") ? raw : null;
}

function buildBccList(): string[] {
  const set = new Set<string>([DEFAULT_BOOKING_BCC]);
  const extra = process.env.ADMIN_NOTIFY_EMAIL;
  if (extra?.includes("@")) set.add(extra.trim());
  return [...set];
}

export async function sendBookingConfirmationEmail(opts: {
  to: string;
  customerName: string;
  packageName: string;
  date: string;
  people: number;
  amountInr: number;
  fullAmountInr: number;
  balanceInr: number;
  paymentId: string;
  /** PDF bytes attached as bill/receipt */
  pdfBytes?: Uint8Array;
  /** Public invoice download link (used when PDF is not attached yet). */
  invoiceUrl?: string;
}): Promise<boolean> {
  const result = await sendBookingConfirmationEmailDetailed(opts);
  return result.ok;
}

export async function sendBookingConfirmationEmailDetailed(opts: {
  to: string;
  customerName: string;
  packageName: string;
  date: string;
  people: number;
  amountInr: number;
  fullAmountInr: number;
  balanceInr: number;
  paymentId: string;
  pdfBytes?: Uint8Array;
  invoiceUrl?: string;
}): Promise<SendMailResult> {
  if (!isMailConfigured()) {
    return {
      ok: false,
      transport: "none",
      error: "Mail not configured on Vercel",
    };
  }

  // Prefer Resend From when API key is present (domain must be verified in Resend).
  const from = resolveMailFromAddress(
    process.env.RESEND_API_KEY?.trim()
      ? process.env.RESEND_FROM_EMAIL ??
          process.env.MAIL_FROM ??
          CONTACT_EMAIL
      : process.env.MAIL_FROM ??
          process.env.MAIL_SMTP_USER ??
          process.env.RESEND_FROM_EMAIL ??
          CONTACT_EMAIL,
  );

  const partialNote =
    opts.balanceInr > 0
      ? `<p><strong>Balance due:</strong> ₹${opts.balanceInr.toLocaleString("en-IN")} (full order ₹${opts.fullAmountInr.toLocaleString("en-IN")}).</p>`
      : "";

  const hasPdf = Boolean(opts.pdfBytes && opts.pdfBytes.length > 0);
  const invoiceLink =
    opts.invoiceUrl && opts.invoiceUrl.startsWith("http")
      ? `<p style="margin:1.25rem 0;"><a href="${escapeHtml(opts.invoiceUrl)}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700;">Download invoice (PDF)</a></p><p style="font-size:12px;color:#555;">Or open: ${escapeHtml(opts.invoiceUrl)}</p>`
      : "";

  const html = `
    <p>Hi ${escapeHtml(opts.customerName)},</p>
    <p>Thank you for booking with <strong>${escapeHtml(SITE_NAME)}</strong>.</p>
    <p><strong>${escapeHtml(opts.packageName)}</strong><br/>
    Date: ${escapeHtml(opts.date)} · ${opts.people} guest(s)<br/>
    Amount paid: ₹${opts.amountInr.toLocaleString("en-IN")}<br/>
    Full order value: ₹${opts.fullAmountInr.toLocaleString("en-IN")}<br/>
    Payment reference: <code>${escapeHtml(opts.paymentId)}</code></p>
    ${partialNote}
    ${invoiceLink}
    <p>${hasPdf ? "Your bill is also attached as a PDF. " : ""}We will confirm your slot shortly. Questions? Reply to this email or contact us at ${escapeHtml(CONTACT_EMAIL)}.</p>
    <p style="margin-top:2rem;font-size:12px;color:#666;">${escapeHtml(SITE_URL)}</p>
  `;

  const attachments =
    hasPdf && opts.pdfBytes
      ? [
          {
            filename: `bill-${escapeFilename(opts.paymentId)}.pdf`,
            content: opts.pdfBytes,
          },
        ]
      : undefined;

  return sendMailDetailed({
    from,
    to: opts.to,
    bcc: buildBccList(),
    subject: `Booking confirmed — ${SITE_NAME}`,
    html,
    attachments,
  });
}

/** Separate email to the business inbox so admins see each paid booking (Titan / support@, etc.). */
export async function sendBookingAdminNotificationEmail(opts: {
  customerName: string;
  customerEmail: string;
  phone: string;
  packageName: string;
  date: string;
  people: number;
  amountInr: number;
  fullAmountInr: number;
  balanceInr: number;
  paymentId: string;
  orderId: string;
  paymentMode: "partial" | "full";
  pickupLocation?: string;
  cartItems?: unknown;
  pdfBytes?: Uint8Array;
}): Promise<boolean> {
  const to = resolveAdminNotifyTo();
  if (!isMailConfigured() || !to) return false;

  const from = resolveMailFromAddress(
    process.env.RESEND_API_KEY?.trim()
      ? process.env.RESEND_FROM_EMAIL ??
          process.env.MAIL_FROM ??
          CONTACT_EMAIL
      : process.env.MAIL_FROM ??
          process.env.MAIL_SMTP_USER ??
          process.env.RESEND_FROM_EMAIL ??
          CONTACT_EMAIL,
  );

  const partialNote =
    opts.balanceInr > 0
      ? `<p><strong>Balance due:</strong> ₹${opts.balanceInr.toLocaleString("en-IN")} (full order ₹${opts.fullAmountInr.toLocaleString("en-IN")}).</p>`
      : "";

  const pickup =
    opts.pickupLocation && String(opts.pickupLocation).trim()
      ? `<p><strong>Pickup / location:</strong> ${escapeHtml(String(opts.pickupLocation).trim())}</p>`
      : "";

  const cartBlock = formatCartItemsHtml(opts.cartItems);

  const html = `
    <p><strong>New paid booking</strong> — ${escapeHtml(SITE_NAME)}</p>
    <p>
      <strong>Customer:</strong> ${escapeHtml(opts.customerName)}<br/>
      <strong>Email:</strong> <a href="mailto:${escapeHtml(opts.customerEmail)}">${escapeHtml(opts.customerEmail)}</a><br/>
      <strong>Phone:</strong> <a href="tel:${escapeHtml(opts.phone.replace(/\D/g, ""))}">${escapeHtml(opts.phone)}</a>
    </p>
    <p>
      <strong>Package / order:</strong> ${escapeHtml(opts.packageName)}<br/>
      <strong>Date:</strong> ${escapeHtml(opts.date)}<br/>
      <strong>Guests / units:</strong> ${opts.people}<br/>
      <strong>Paid now:</strong> ₹${opts.amountInr.toLocaleString("en-IN")}<br/>
      <strong>Full order value:</strong> ₹${opts.fullAmountInr.toLocaleString("en-IN")}<br/>
      <strong>Payment mode:</strong> ${opts.paymentMode}
    </p>
    ${partialNote}
    ${pickup}
    ${cartBlock}
    <p>
      <strong>Razorpay payment ID:</strong> <code>${escapeHtml(opts.paymentId)}</code><br/>
      <strong>Razorpay order ID:</strong> <code>${escapeHtml(opts.orderId)}</code>
    </p>
    <p style="font-size:12px;color:#666;">Manage in admin → Bookings. ${escapeHtml(SITE_URL)}</p>
  `;

  const attachments =
    opts.pdfBytes && opts.pdfBytes.length > 0
      ? [
          {
            filename: `bill-${escapeFilename(opts.paymentId)}.pdf`,
            content: opts.pdfBytes,
          },
        ]
      : undefined;

  const result = await sendMailDetailed({
    from,
    to,
    subject: `New booking — ${opts.customerName} — ₹${opts.amountInr.toLocaleString("en-IN")} paid`,
    html,
    attachments,
  });
  return result.ok;
}

function formatCartItemsHtml(cart: unknown): string {
  if (!Array.isArray(cart) || cart.length === 0) return "";
  const rows: string[] = [];
  for (const item of cart) {
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const name = String(o.name ?? "Item");
      const qty = Number(o.quantity) || 0;
      const line = Number(o.lineTotal);
      const parts = [
        escapeHtml(name),
        qty > 0 ? `× ${qty}` : "",
        Number.isFinite(line) && line > 0
          ? `₹${line.toLocaleString("en-IN")}`
          : "",
      ].filter(Boolean);
      rows.push(`<li>${parts.join(" · ")}</li>`);
    }
  }
  if (!rows.length) return "";
  return `<p><strong>Cart lines</strong></p><ul>${rows.join("")}</ul>`;
}

function escapeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
