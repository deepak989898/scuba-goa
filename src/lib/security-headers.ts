/**
 * Browser security headers for bookscubagoa.com (Vercel / Next.js).
 * Keep CSP aligned with GA4, Clarity, Meta Pixel, Razorpay, Firebase, Unsplash.
 */

export const SITE_ORIGINS = [
  "https://www.bookscubagoa.com",
  "https://bookscubagoa.com",
] as const;

/** Primary origin used when a static ACAO value is required (override Vercel *). */
export const PRIMARY_SITE_ORIGIN = "https://www.bookscubagoa.com";

/**
 * Content-Security-Policy — practical allow-list for this booking site.
 * 'unsafe-inline' / 'unsafe-eval' needed for Next.js + third-party tags.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://connect.facebook.net",
    "https://www.clarity.ms",
    "https://scripts.clarity.ms",
    "https://checkout.razorpay.com",
    "https://*.razorpay.com",
  ].join(" "),
  [
    "style-src",
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
  ].join(" "),
  [
    "img-src",
    "'self'",
    "data:",
    "blob:",
    "https:",
  ].join(" "),
  [
    "font-src",
    "'self'",
    "data:",
    "https://fonts.gstatic.com",
  ].join(" "),
  [
    "connect-src",
    "'self'",
    "https://www.google-analytics.com",
    "https://analytics.google.com",
    "https://region1.google-analytics.com",
    "https://www.googletagmanager.com",
    "https://www.facebook.com",
    "https://connect.facebook.net",
    "https://*.facebook.com",
    "https://www.clarity.ms",
    "https://*.clarity.ms",
    "https://c.bing.com",
    "https://*.googleapis.com",
    "https://*.firebaseio.com",
    "wss://*.firebaseio.com",
    "https://*.firebaseapp.com",
    "https://*.cloudfunctions.net",
    "https://firebasestorage.googleapis.com",
    "https://storage.googleapis.com",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://firestore.googleapis.com",
    "https://api.razorpay.com",
    "https://*.razorpay.com",
    "https://checkout.razorpay.com",
    "https://lumberjack.razorpay.com",
  ].join(" "),
  [
    "frame-src",
    "'self'",
    "https://api.razorpay.com",
    "https://checkout.razorpay.com",
    "https://*.razorpay.com",
    "https://www.facebook.com",
    "https://www.googletagmanager.com",
    "https://*.firebaseapp.com",
  ].join(" "),
  "worker-src 'self' blob:",
  "media-src 'self' blob: https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

export function securityHeaderPairs(opts?: {
  /** When true, set a fixed ACAO (overrides Vercel default *). */
  includeCorsOrigin?: boolean;
}): { key: string; value: string }[] {
  const headers: { key: string; value: string }[] = [
    { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), browsing-topics=()",
    },
    // Allow Google/Razorpay OAuth & checkout popups while isolating other windows
    {
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin-allow-popups",
    },
    { key: "X-DNS-Prefetch-Control", value: "on" },
  ];

  if (opts?.includeCorsOrigin !== false) {
    headers.push({
      key: "Access-Control-Allow-Origin",
      value: PRIMARY_SITE_ORIGIN,
    });
    headers.push({ key: "Vary", value: "Origin" });
  }

  return headers;
}
