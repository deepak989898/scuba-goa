export const SITE_NAME = "AquaVista Goa";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://aquavista-goa.example.com";
export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919876543210";
export const WHATSAPP_DEFAULT_MESSAGE = encodeURIComponent(
  "Hi, I want to book scuba diving in Goa"
);

export function whatsappLink(message?: string): string {
  const text = message
    ? encodeURIComponent(message)
    : WHATSAPP_DEFAULT_MESSAGE;
  return `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${text}`;
}
