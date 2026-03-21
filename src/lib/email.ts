import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/constants";

const RESEND_API = "https://api.resend.com/emails";

/** Always BCC this address on booking confirmations (per business request). */
const DEFAULT_BOOKING_BCC = "vedrajsingh94@gmail.com";

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

  const from =
    process.env.RESEND_FROM_EMAIL ?? `${SITE_NAME} <onboarding@resend.dev>`;

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

  return res.ok;
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
