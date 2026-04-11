import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/constants";

const RESEND_API = "https://api.resend.com/emails";

/** Always BCC this address on booking confirmations (per business request). */
const DEFAULT_BOOKING_BCC = "vedrajsingh94@gmail.com";

/**
 * Inbox that receives a dedicated “new booking” email (not only BCC).
 * Resend often does not deliver BCC when it matches RESEND_FROM_EMAIL, so this is sent as a separate To.
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
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const from = formatFromAddress(
    process.env.RESEND_FROM_EMAIL ?? CONTACT_EMAIL
  );

  const partialNote =
    opts.balanceInr > 0
      ? `<p><strong>Balance due:</strong> ₹${opts.balanceInr.toLocaleString("en-IN")} (full order ₹${opts.fullAmountInr.toLocaleString("en-IN")}).</p>`
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
    <p>${opts.pdfBytes && opts.pdfBytes.length > 0 ? "Your bill is attached as a PDF. " : ""}We’ll confirm your slot shortly. Questions? Reply to this email or contact us at ${escapeHtml(CONTACT_EMAIL)}.</p>
    <p style="margin-top:2rem;font-size:12px;color:#666;">${escapeHtml(SITE_URL)}</p>
  `;

  const body: Record<string, unknown> = {
    from,
    to: [opts.to],
    bcc: buildBccList(),
    subject: `Booking confirmed — ${SITE_NAME}`,
    html,
  };

  if (opts.pdfBytes && opts.pdfBytes.length > 0) {
    const b64 = Buffer.from(opts.pdfBytes).toString("base64");
    body.attachments = [
      {
        filename: `bill-${escapeFilename(opts.paymentId)}.pdf`,
        content: b64,
      },
    ];
  }

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Resend send failed", {
      status: res.status,
      from,
      to: opts.to,
      body: errText.slice(0, 800),
    });
  }

  return res.ok;
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
  const key = process.env.RESEND_API_KEY;
  const to = resolveAdminNotifyTo();
  if (!key || !to) return false;

  const from = formatFromAddress(
    process.env.RESEND_FROM_EMAIL ?? CONTACT_EMAIL
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

  const body: Record<string, unknown> = {
    from,
    to: [to],
    subject: `New booking — ${opts.customerName} — ₹${opts.amountInr.toLocaleString("en-IN")} paid`,
    html,
  };

  if (opts.pdfBytes && opts.pdfBytes.length > 0) {
    const b64 = Buffer.from(opts.pdfBytes).toString("base64");
    body.attachments = [
      {
        filename: `bill-${escapeFilename(opts.paymentId)}.pdf`,
        content: b64,
      },
    ];
  }

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Resend admin booking notify failed", {
      status: res.status,
      from,
      to,
      body: errText.slice(0, 800),
    });
  }

  return res.ok;
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

function formatFromAddress(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return `${SITE_NAME} <onboarding@resend.dev>`;
  if (trimmed.includes("<") && trimmed.includes(">")) return trimmed;
  if (trimmed.includes("@")) return `${SITE_NAME} <${trimmed}>`;
  return `${SITE_NAME} <onboarding@resend.dev>`;
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
