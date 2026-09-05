import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tsToIso(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "object" && v !== null && "toDate" in v) {
    const toDate = (v as { toDate?: () => Date }).toDate;
    if (typeof toDate === "function") {
      return toDate().toISOString();
    }
  }
  if (
    typeof v === "object" &&
    v !== null &&
    "seconds" in v &&
    typeof (v as { seconds?: unknown }).seconds === "number"
  ) {
    const raw = v as { seconds: number; nanoseconds?: number };
    const ms =
      raw.seconds * 1000 + Math.floor((raw.nanoseconds ?? 0) / 1e6);
    return new Date(ms).toISOString();
  }
  if (typeof v === "string" && v.trim()) return v;
  return undefined;
}

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const visitorId = new URL(req.url).searchParams.get("visitorId")?.trim();
  if (!visitorId) {
    return NextResponse.json({ error: "visitorId required" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const [visitorSnap, sessionsSnap] = await Promise.all([
      db.collection("analyticsVisitors").doc(visitorId).get(),
      db
        .collection("analyticsSessions")
        .where("visitorId", "==", visitorId)
        .limit(40)
        .get(),
    ]);

    const visitorData = visitorSnap.exists
      ? (visitorSnap.data() as Record<string, unknown>)
      : null;
    const visitHistory = Array.isArray(visitorData?.visitHistory)
      ? visitorData.visitHistory
      : [];

    const sessions = sessionsSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        sessionId: String(data.sessionId ?? d.id),
        visitorId: String(data.visitorId ?? ""),
        firstSeenAt: tsToIso(data.firstSeenAt),
        lastSeenAt: tsToIso(data.lastSeenAt),
        deviceLabel: String(data.deviceLabel ?? ""),
        deviceModel: String(data.deviceModel ?? ""),
        uaSnippet: String(data.uaSnippet ?? ""),
        geoCity: String(data.geoCity ?? ""),
        geoRegion: String(data.geoRegion ?? ""),
        geoRegionName: String(data.geoRegionName ?? ""),
        geoCountry: String(data.geoCountry ?? ""),
        geoCountryName: String(data.geoCountryName ?? ""),
        landingPath: String(data.landingPath ?? ""),
        lastPath: String(data.lastPath ?? ""),
      };
    });

    return NextResponse.json({ visitHistory, sessions });
  } catch (e) {
    console.error("[admin/analytics/visitor-history]", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Could not load visit history",
      },
      { status: 500 },
    );
  }
}
