/**
 * Transactional SMS after booking payment.
 * Prefer MSG91 (India); Twilio as international fallback.
 * Firebase Auth SMS is OTP-only — not used for booking messages.
 */

function trimEnv(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

export function isSmsConfigured(): boolean {
  return Boolean(
    trimEnv("MSG91_AUTH_KEY") ||
      (trimEnv("TWILIO_ACCOUNT_SID") &&
        trimEnv("TWILIO_AUTH_TOKEN") &&
        trimEnv("TWILIO_FROM_NUMBER")),
  );
}

export function describeSmsConfig(): string {
  if (trimEnv("MSG91_AUTH_KEY")) return "msg91";
  if (
    trimEnv("TWILIO_ACCOUNT_SID") &&
    trimEnv("TWILIO_AUTH_TOKEN") &&
    trimEnv("TWILIO_FROM_NUMBER")
  ) {
    return "twilio";
  }
  return "missing MSG91_AUTH_KEY or TWILIO_* on Vercel";
}

/** India: 10-digit → 91XXXXXXXXXX; already 91… kept. */
export function toE164IndiaMobile(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10 && /^[6-9]/.test(d)) return `91${d}`;
  if (d.length === 12 && d.startsWith("91")) return d;
  if (d.length === 11 && d.startsWith("0")) {
    const ten = d.slice(1);
    if (/^[6-9]\d{9}$/.test(ten)) return `91${ten}`;
  }
  if (d.length >= 10 && d.length <= 15) return d;
  return null;
}

export type BookingSmsInput = {
  phone: string;
  customerName: string;
  packageName: string;
  date: string;
  people: number;
  paidInr: number;
  paymentId: string;
  invoiceUrl: string;
  balanceInr?: number;
};

/** One compact SMS: booking + invoice link + service details. */
export function buildBookingSmsBody(input: BookingSmsInput): string {
  const name = input.customerName.trim().slice(0, 28) || "Guest";
  const pkg = input.packageName.trim().slice(0, 48) || "Scuba booking";
  const balance =
    input.balanceInr && input.balanceInr > 0
      ? ` Balance ₹${input.balanceInr.toLocaleString("en-IN")}.`
      : "";
  return [
    `Book Scuba Goa: Hi ${name}, booking confirmed!`,
    `${pkg} | ${input.date} | ${input.people} guest(s)`,
    `Paid ₹${input.paidInr.toLocaleString("en-IN")}.${balance}`,
    `Pay ID: ${input.paymentId}`,
    `Invoice PDF: ${input.invoiceUrl}`,
    `Also check email. Help: support@bookscubagoa.com`,
  ].join("\n");
}

async function sendViaMsg91(mobileE164: string, message: string): Promise<boolean> {
  const authKey = trimEnv("MSG91_AUTH_KEY");
  if (!authKey) return false;

  const sender = trimEnv("MSG91_SENDER_ID") || "BSGOA";
  const route = trimEnv("MSG91_ROUTE") || "4";
  // MSG91 expects country+number without +
  const mobiles = mobileE164.replace(/^\+/, "");

  const url = new URL("https://api.msg91.com/api/sendhttp.php");
  url.searchParams.set("authkey", authKey);
  url.searchParams.set("mobiles", mobiles);
  url.searchParams.set("message", message);
  url.searchParams.set("sender", sender.slice(0, 6));
  url.searchParams.set("route", route);
  url.searchParams.set("country", "91");

  try {
    const res = await fetch(url.toString(), { method: "GET" });
    const text = await res.text();
    // Success often returns a request id (numeric/hex); failures include "error"
    if (!res.ok || /error|invalid|reject/i.test(text)) {
      console.error("MSG91 SMS failed", { status: res.status, body: text.slice(0, 300) });
      return false;
    }
    return true;
  } catch (e) {
    console.error("MSG91 SMS error", e);
    return false;
  }
}

async function sendViaTwilio(mobileE164: string, message: string): Promise<boolean> {
  const sid = trimEnv("TWILIO_ACCOUNT_SID");
  const token = trimEnv("TWILIO_AUTH_TOKEN");
  const from = trimEnv("TWILIO_FROM_NUMBER");
  if (!sid || !token || !from) return false;

  const to = mobileE164.startsWith("+") ? mobileE164 : `+${mobileE164}`;
  const body = new URLSearchParams({ To: to, From: from, Body: message });
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Twilio SMS failed", {
        status: res.status,
        body: errText.slice(0, 400),
      });
      return false;
    }
    return true;
  } catch (e) {
    console.error("Twilio SMS error", e);
    return false;
  }
}

export async function sendBookingConfirmationSms(
  input: BookingSmsInput,
): Promise<boolean> {
  if (!isSmsConfigured()) return false;
  const mobile = toE164IndiaMobile(input.phone);
  if (!mobile) {
    console.error("SMS skipped: invalid phone", input.phone);
    return false;
  }
  const message = buildBookingSmsBody(input);
  if (trimEnv("MSG91_AUTH_KEY")) {
    return sendViaMsg91(mobile, message);
  }
  return sendViaTwilio(mobile, message);
}
