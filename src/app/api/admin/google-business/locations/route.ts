import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getCachedGoogleBusinessAccounts,
  getCachedGoogleBusinessLocations,
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
