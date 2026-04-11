export const SITE_NAME = "Book Scuba Goa";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookscubagoa.com";

/** Primary search phrases for on-page copy, metadata, and blog strategy */
export const PRIMARY_SEO_KEYWORDS = [
  "scuba diving in Goa",
  "scuba diving price Goa",
  "best scuba in Goa",
  "scuba diving Goa booking",
  "Grande Island scuba",
] as const;
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "support@bookscubagoa.com";

/** International digits only, no + (e.g. 919217290871 for India +91 92172 90871) */
export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919217290871";

const phoneDigits = () => WHATSAPP_NUMBER.replace(/\D/g, "");

function formatIndiaPhoneLabel(digits: string): string {
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return `+${digits}`;
}

/** Same number for tel: links in footer / contact */
export const CONTACT_PHONE_HREF = `tel:+${phoneDigits()}`;

export const CONTACT_PHONE_LABEL = (() => formatIndiaPhoneLabel(phoneDigits()))();

/** Second call line (optional). Digits only with country code, e.g. 918354075026 */
const secondPhoneDigits = () =>
  (process.env.NEXT_PUBLIC_CONTACT_PHONE_SECOND ?? "918354075026").replace(
    /\D/g,
    "",
  );

export const CONTACT_PHONE_SECOND_HREF = `tel:+${secondPhoneDigits()}`;

export const CONTACT_PHONE_SECOND_LABEL = (() =>
  formatIndiaPhoneLabel(secondPhoneDigits()))();

/**
 * Missed-call callback line (optional dedicated virtual number via env).
 * Defaults to the main WhatsApp / business number.
 */
const missedCallDigits = () =>
  (process.env.NEXT_PUBLIC_MISSED_CALL_NUMBER ?? WHATSAPP_NUMBER).replace(
    /\D/g,
    ""
  );

export const MISSED_CALL_TEL_HREF = `tel:+${missedCallDigits()}`;
export const MISSED_CALL_DISPLAY_LABEL = formatIndiaPhoneLabel(missedCallDigits());

export const WHATSAPP_DEFAULT_MESSAGE = encodeURIComponent(
  "Hi, I want to book scuba diving in Goa"
);

export function whatsappLink(message?: string): string {
  const text = message
    ? encodeURIComponent(message)
    : WHATSAPP_DEFAULT_MESSAGE;
  return `https://wa.me/${phoneDigits()}?text=${text}`;
}

/** Opens a chat with the customer's number (digits only in URL). Returns null if the number looks invalid. */
export function customerWhatsappLink(phoneRaw: string, message: string): string | null {
  let d = phoneRaw.replace(/\D/g, "");
  if (d.length < 10) return null;
  if (d.length === 10 && !d.startsWith("91")) d = `91${d}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}

/** Google Maps embed (office / meeting point — Scuba Diving with Island Trip, Baga). */
export const OFFICE_MAP_EMBED_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7687.314906828183!2d73.74467907770996!3d15.556483400000015!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bbfebd8f126b611%3A0xcca5dbc31fb0bb7d!2sScuba%20Diving%20with%20Island%20Trip!5e0!3m2!1sen!2sin!4v1775777440061!5m2!1sen!2sin";

export const OFFICE_ADDRESS_SINGLELINE =
  "Office no 2, Titos Lane 2, Saunta Vaddo, Baga, Calangute, Goa 403516";

export const OFFICE_ADDRESS_LINES = [
  "Office no 2, Titos Lane 2, Saunta Vaddo",
  "Baga, Calangute, Goa 403516",
] as const;
