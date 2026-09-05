import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tsToIso(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string" && v.trim()) return v;
  if (typeof v === "number" && Number.isFinite(v)) {
    return new Date(v).toISOString();
  }
  if (typeof v !== "object") return undefined;

  if (
    "toDate" in v &&
    typeof (v as { toDate?: () => Date }).toDate === "function"
  ) {
    try {
      return (v as { toDate: () => Date }).toDate().toISOString();
    } catch {
      // Fall through to seconds/_seconds parsing.
    }
  }

  const raw = v as {
    seconds?: unknown;
    nanoseconds?: unknown;
    _seconds?: unknown;
    _nanoseconds?: unknown;
  };
  const sec =
    typeof raw.seconds === "number"
      ? raw.seconds
      : typeof raw._seconds === "number"
        ? raw._seconds
        : null;
  if (sec == null) return undefined;
  const nano =
    typeof raw.nanoseconds === "number"
      ? raw.nanoseconds
      : typeof raw._nanoseconds === "number"
        ? raw._nanoseconds
        : 0;
  return new Date(sec * 1000 + Math.floor(nano / 1e6)).toISOString();
}

function sanitizeVisitHistory(
  visitHistory: unknown,
): Array<Record<string, string>> {
  if (!Array.isArray(visitHistory)) return [];
  return visitHistory
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const e = entry as Record<string, unknown>;
      const at =
        typeof e.at === "string" ? e.at : tsToIso(e.at) ?? "";
      return {
        sessionId: String(e.sessionId ?? ""),
        at,
        geoLine: String(e.geoLine ?? ""),
        geoCity: String(e.geoCity ?? ""),
        geoRegionName: String(e.geoRegionName ?? ""),
        geoCountryName: String(e.geoCountryName ?? ""),
        deviceModel: String(e.deviceModel ?? ""),
        deviceLabel: String(e.deviceLabel ?? ""),
        landingPath: String(e.landingPath ?? ""),
      };
    });
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
    const visitHistory = sanitizeVisitHistory(visitorData?.visitHistory);

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
