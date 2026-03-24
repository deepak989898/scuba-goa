/**
 * Absolute site URL for links emailed or shared (WhatsApp).
 * Prefer NEXT_PUBLIC_SITE_URL in production so shared links stay correct behind proxies.
 */
export function getPublicBaseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim();
  if (env) return env;

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    req.headers.get("host")?.trim();
  if (forwardedHost) {
    const proto = forwardedProto?.split(",")[0]?.trim() ?? "https";
    return `${proto}://${forwardedHost}`;
  }

  return new URL(req.url).origin;
}
