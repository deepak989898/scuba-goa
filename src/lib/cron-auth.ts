/**
 * Vercel Cron sends Authorization: Bearer <CRON_SECRET> when configured.
 * cron-job.org should hit the **www** host — apex 308-redirects to www and
 * often strips Authorization, which yields silent 401s (no email/Telegram).
 *
 * Also accepts `X-Cron-Secret: <CRON_SECRET>` as a fallback header that
 * survives redirects better than Authorization on some schedulers.
 */
export function verifyCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[cron-auth] CRON_SECRET is not set — all cron requests fail");
    return false;
  }

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const xCron = req.headers.get("x-cron-secret")?.trim();
  if (xCron && xCron === secret) return true;

  return false;
}
