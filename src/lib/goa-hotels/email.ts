import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/constants";
import {
  isMailConfigured,
  resolveMailFromAddress,
  sendMailDetailed,
} from "@/lib/mail-transport";
import { formatHotelDateLabel, formatHotelPriceInr } from "@/lib/goa-hotels/format";

const ADMIN_BCC = "vedrajsingh94@gmail.com";

function adminTo(): string {
  const raw = process.env.BOOKING_ADMIN_NOTIFY_EMAIL?.trim() || CONTACT_EMAIL.trim();
  return raw.includes("@") ? raw : CONTACT_EMAIL;
}

export async function sendHotelBookingConfirmationEmail(opts: {
  to: string;
  guestName: string;
  hotelName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  amountInr: number;
  paymentId: string;
  locality?: string;
}): Promise<boolean> {
  if (!isMailConfigured()) return false;

  const from = resolveMailFromAddress(
    process.env.RESEND_FROM_EMAIL ?? process.env.MAIL_FROM ?? CONTACT_EMAIL,
  );
  const site = SITE_URL.replace(/\/$/, "");
  const guests =
    opts.children > 0
      ? `${opts.adults} adult(s), ${opts.children} child(ren)`
      : `${opts.adults} guest(s)`;

  const html = `
    <p>Hi ${opts.guestName},</p>
    <p>Your Goa hotel booking with <strong>${SITE_NAME}</strong> is confirmed. Payment received.</p>
    <table cellpadding="6" style="border-collapse:collapse;font-size:14px;">
      <tr><td><strong>Hotel</strong></td><td>${opts.hotelName}${opts.locality ? ` · ${opts.locality}` : ""}</td></tr>
      <tr><td><strong>Room</strong></td><td>${opts.roomName}</td></tr>
      <tr><td><strong>Check-in</strong></td><td>${formatHotelDateLabel(opts.checkIn)}</td></tr>
      <tr><td><strong>Check-out</strong></td><td>${formatHotelDateLabel(opts.checkOut)}</td></tr>
      <tr><td><strong>Nights</strong></td><td>${opts.nights}</td></tr>
      <tr><td><strong>Guests</strong></td><td>${guests}</td></tr>
      <tr><td><strong>Paid</strong></td><td>${formatHotelPriceInr(opts.amountInr)}</td></tr>
      <tr><td><strong>Payment ID</strong></td><td>${opts.paymentId}</td></tr>
    </table>
    <p>Our team will coordinate with the hotel and share voucher details if needed. For help, reply to this email or WhatsApp us.</p>
    <p><a href="${site}/hotels">Browse more Goa hotels</a></p>
  `;

  const result = await sendMailDetailed({
    from,
    to: opts.to,
    bcc: [ADMIN_BCC],
    subject: `Hotel booking confirmed — ${opts.hotelName}`,
    html,
  });
  return result.ok;
}

export async function sendHotelBookingAdminEmail(opts: {
  guestName: string;
  hotelName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  amountInr: number;
  paymentId: string;
  locality?: string;
  to?: string;
}): Promise<boolean> {
  if (!isMailConfigured()) return false;

  const from = resolveMailFromAddress(
    process.env.RESEND_FROM_EMAIL ?? process.env.MAIL_FROM ?? CONTACT_EMAIL,
  );

  const html = `
    <p><strong>New Goa hotel booking</strong> (Safar Sathi catalog)</p>
    <p>${opts.guestName} · ${opts.hotelName} · ${opts.roomName}</p>
    <p>${formatHotelDateLabel(opts.checkIn)} → ${formatHotelDateLabel(opts.checkOut)} (${opts.nights} night(s))</p>
    <p>Paid ${formatHotelPriceInr(opts.amountInr)} · Payment ${opts.paymentId}</p>
    <p>Admin: <a href="${SITE_URL.replace(/\/$/, "")}/admin/goa-hotel-bookings">Hotel bookings</a></p>
  `;

  const result = await sendMailDetailed({
    from,
    to: opts.to ?? adminTo(),
    bcc: [ADMIN_BCC],
    subject: `Hotel booking — ${opts.hotelName} — ${opts.guestName}`,
    html,
  });
  return result.ok;
}
