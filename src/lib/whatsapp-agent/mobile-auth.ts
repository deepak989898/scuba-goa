/** Auth for the Android WhatsApp assistant app — separate from Meta Cloud API / social media. */

export function getWhatsAppMobileAppSecret(): string {
  return process.env.WHATSAPP_MOBILE_APP_SECRET?.trim() ?? "";
}

export function isWhatsAppMobileAssistantConfigured(): boolean {
  return Boolean(getWhatsAppMobileAppSecret());
}

export function verifyWhatsAppMobileRequest(req: Request): boolean {
  const secret = getWhatsAppMobileAppSecret();
  if (!secret) return false;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const header = req.headers.get("x-whatsapp-mobile-secret")?.trim();
  if (header && header === secret) return true;

  return false;
}
