export const SITE_NAME = "Book Scuba Goa";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookscubagoa.web.app";
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "support@bookscubagoa.com";

/** International digits only, no + (e.g. 919217290871 for India +91 92172 90871) */
export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919217290871";

const phoneDigits = () => WHATSAPP_NUMBER.replace(/\D/g, "");

/** Same number for tel: links in footer / contact */
export const CONTACT_PHONE_HREF = `tel:+${phoneDigits()}`;

export const CONTACT_PHONE_LABEL = (() => {
  const d = phoneDigits();
  if (d.length === 12 && d.startsWith("91")) {
    return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  }
  return `+${d}`;
})();

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
