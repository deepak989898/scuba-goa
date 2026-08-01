import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { listChangeVersions } from "@/lib/seo-intelligence/suggestions-store";
import { listSuggestions } from "@/lib/seo-intelligence/suggestions-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const [versions, appliedSuggestions] = await Promise.all([
    listChangeVersions(80),
    listSuggestions({
      status: ["applied", "rolled_back", "failed"],
      limit: 100,
    }),
  ]);
  return NextResponse.json({
    versions,
    suggestions: appliedSuggestions,
    disclaimer:
      "Before/after metrics can be affected by seasonality and Google updates. Causation is not claimed.",
  });
}
