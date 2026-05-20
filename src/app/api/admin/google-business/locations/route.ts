import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getCachedGoogleBusinessAccounts,
  getCachedGoogleBusinessLocations,
  getStaleCachedGoogleBusinessAccounts,
  getStaleCachedGoogleBusinessLocations,
  setCachedGoogleBusinessAccounts,
  setCachedGoogleBusinessLocations,
} from "@/lib/google-business/api-cache";
import {
  describeGoogleBusinessOAuthGap,
  getGoogleBusinessOAuthConfig,
} from "@/lib/google-business/config";
import {
  listGoogleBusinessAccounts,
  listGoogleBusinessLocations,
} from "@/lib/google-business/client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const config = await getGoogleBusinessOAuthConfig();
  if (!config) {
    return NextResponse.json(
      { error: describeGoogleBusinessOAuthGap() },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const accountId = url.searchParams.get("accountId")?.trim();
  const skipCache = url.searchParams.get("fresh") === "1";

  try {
    if (accountId) {
      if (!skipCache) {
        const cached = await getCachedGoogleBusinessLocations(accountId);
        if (cached) return NextResponse.json({ locations: cached, cached: true });
      }
      const locations = await listGoogleBusinessLocations(config, accountId);
      await setCachedGoogleBusinessLocations(accountId, locations);
      return NextResponse.json({ locations, cached: false });
    }

    if (!skipCache) {
      const cached = await getCachedGoogleBusinessAccounts();
      if (cached) return NextResponse.json({ accounts: cached, cached: true });
    }
    const accounts = await listGoogleBusinessAccounts(config);
    await setCachedGoogleBusinessAccounts(accounts);
    return NextResponse.json({ accounts, cached: false });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to list locations";
    const rateLimited =
      /rate limit|quota exceeded|429/i.test(message) || message.includes("429");
    if (accountId) {
      const stale = await getStaleCachedGoogleBusinessLocations(accountId);
      if (stale?.length) {
        return NextResponse.json({
          locations: stale,
          cached: true,
          stale: true,
          warning:
            "Google rate limit — showing last saved list. Or set Account / Location IDs manually below.",
        });
      }
    } else {
      const stale = await getStaleCachedGoogleBusinessAccounts();
      if (stale?.length) {
        return NextResponse.json({
          accounts: stale,
          cached: true,
          stale: true,
          warning:
            "Google rate limit — showing last saved list. Use manual IDs (recommended) or try again tomorrow.",
        });
      }
    }
    if (rateLimited) {
      return NextResponse.json(
        {
          error:
            "Google Business list API quota exceeded for this Cloud project. Use **Manual location IDs** in Admin (no API list needed), or create a dedicated Google Cloud project with Business APIs enabled and wait 24h for quota reset.",
        },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
