import type { SeoPageAudit } from "@/lib/seo-agent/types";

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(re: RegExp, html: string): string | undefined {
  const m = re.exec(html);
  const v = m?.[1] ? String(m[1]).trim() : "";
  return v || undefined;
}

export async function auditPage(url: string): Promise<SeoPageAudit> {
  const u = new URL(url);
  const path = u.pathname || "/";
  try {
    const res = await fetch(url, {
      headers: {
        // Avoid some bot blocks; harmless if ignored.
        "User-Agent":
          "Mozilla/5.0 (compatible; BookScubaGoaSeoAgent/1.0; +https://bookscubagoa.com)",
      },
      cache: "no-store",
    });
    const html = await res.text().catch(() => "");
    const title = firstMatch(/<title[^>]*>([^<]+)<\/title>/i, html);
    const metaDescription = firstMatch(
      /<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']+)[\"'][^>]*>/i,
      html,
    );
    const h1 = firstMatch(/<h1[^>]*>([^<]+)<\/h1>/i, html);
    const hasJsonLdSchema = /application\/ld\+json/i.test(html);
    const text = stripTags(html);
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

    return {
      url,
      path,
      httpStatus: res.status,
      title,
      metaDescription,
      hasJsonLdSchema,
      wordCount,
      h1,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[seo-audit]", url, msg);
    return { url, path, hasJsonLdSchema: false, wordCount: 0 };
  }
}

