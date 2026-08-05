import { SITE_URL } from "@/lib/constants";
import { getGscSitemapStatus, submitGscSitemap } from "./gsc-client";
import { getSeoSettings, saveSeoSettings } from "./settings";
import { logAction, saveSitemapRecord } from "./store";
import { siteId } from "./normalize-url";

const SITEMAP_PATHS = [
  { id: "root", path: "/sitemap.xml" },
  { id: "blog", path: "/sitemaps/blog.xml" },
  { id: "guides", path: "/sitemaps/guides.xml" },
  { id: "services", path: "/sitemaps/services.xml" },
  { id: "static", path: "/sitemaps/static.xml" },
];

/** Debounced Search Console Sitemap API submit (not deprecated ping). */
export async function submitSitemapsIfDue(force = false): Promise<{
  submitted: number;
  skipped: boolean;
  errors: string[];
}> {
  const settings = await getSeoSettings();
  if (settings.paused && !force) {
    return { submitted: 0, skipped: true, errors: [] };
  }

  if (!force && settings.lastSitemapSubmitAt) {
    const last = new Date(settings.lastSitemapSubmitAt).getTime();
    const minGap = settings.sitemapSubmitDebounceMinutes * 60_000;
    if (Date.now() - last < minGap) {
      return { submitted: 0, skipped: true, errors: [] };
    }
  }

  const base = SITE_URL.replace(/\/$/, "");
  const errors: string[] = [];
  let submitted = 0;
  const now = new Date().toISOString();

  for (const sm of SITEMAP_PATHS) {
    const fullUrl = `${base}${sm.path}`;
    const result = await submitGscSitemap(fullUrl);
    if (!result.ok) {
      errors.push(`${sm.path}: ${result.error}`);
      await saveSitemapRecord({
        id: sm.id,
        path: sm.path,
        fullUrl,
        urlCount: 0,
        lastSubmittedAt: null,
        lastGoogleStatus: null,
        lastError: result.error,
        siteId: siteId(),
        updatedAt: now,
      });
      continue;
    }
    submitted += 1;
    const status = await getGscSitemapStatus(fullUrl);
    await saveSitemapRecord({
      id: sm.id,
      path: sm.path,
      fullUrl,
      urlCount: 0,
      lastSubmittedAt: now,
      lastGoogleStatus: status.ok ? status.status : null,
      lastError: status.ok ? null : status.error,
      siteId: siteId(),
      updatedAt: now,
    });
  }

  if (submitted > 0) {
    await saveSeoSettings({ lastSitemapSubmitAt: now });
  }
  await logAction({
    action: "sitemap_submit",
    detail: force
      ? `Forced submit: ${submitted} ok, ${errors.length} errors`
      : `Debounced submit: ${submitted} ok, ${errors.length} errors`,
    ok: errors.length === 0,
  });

  return { submitted, skipped: false, errors };
}
