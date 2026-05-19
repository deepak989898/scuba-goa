import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getGoogleBusinessRuntimeConfig } from "@/lib/google-business/config";
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

  const config = await getGoogleBusinessRuntimeConfig();
  if (!config) {
    return NextResponse.json(
      {
        error:
          "Connect Google Business first (OAuth) and ensure refresh token is saved.",
      },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const accountId = url.searchParams.get("accountId")?.trim();

  try {
    if (accountId) {
      const locations = await listGoogleBusinessLocations(config, accountId);
      return NextResponse.json({ locations });
    }
    const accounts = await listGoogleBusinessAccounts(config);
    return NextResponse.json({ accounts });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to list locations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
