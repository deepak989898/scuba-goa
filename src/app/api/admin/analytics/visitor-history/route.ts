import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VisitPayload = {
  sessionId: string;
  at: string;
  durationMs: number;
  geoLine: string;
  deviceModel: string;
  deviceLabel: string;
  landingPath: string;
  isCurrent: boolean;
};

function tsToMs(v: unknown): number {
  const iso = tsToIso(v);
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

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
      // Fall through.
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

function geoLineFrom(data: Record<string, unknown>): string {
  const parts = [
    data.geoCity,
    data.geoRegionName || data.geoRegion,
    data.geoCountryName || data.geoCountry,
  ]
    .map((p) => String(p ?? "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

function sessionDurationMs(data: Record<string, unknown>): number {
  const engaged =
    typeof data.engagedMs === "number" && Number.isFinite(data.engagedMs)
      ? Math.max(0, data.engagedMs)
      : 0;
  if (engaged > 0) return engaged;

  const first = tsToMs(data.firstSeenAt);
  const last = tsToMs(data.lastSeenAt);
  if (first > 0 && last >= first) return last - first;

  if (data.pageDurationsMs && typeof data.pageDurationsMs === "object") {
    const sum = Object.values(
      data.pageDurationsMs as Record<string, number>,
    ).reduce((acc, n) => acc + (Number.isFinite(n) ? Math.max(0, n) : 0), 0);
    if (sum > 0) return sum;
  }

  return 0;
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
    })
    .filter((e) => e.sessionId || e.at);
}

function visitFromSession(
  data: Record<string, unknown>,
  sessionId: string,
  isCurrent: boolean,
): VisitPayload {
  const at =
    tsToIso(data.firstSeenAt) ||
    tsToIso(data.lastSeenAt) ||
    new Date().toISOString();
  const geoLine = geoLineFrom(data);
  return {
    sessionId,
    at,
    durationMs: sessionDurationMs(data),
    geoLine,
    deviceModel: String(data.deviceModel ?? ""),
    deviceLabel: String(data.deviceLabel ?? ""),
    landingPath: String(data.landingPath ?? data.lastPath ?? ""),
    isCurrent,
  };
}

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const visitorId = url.searchParams.get("visitorId")?.trim();
  const currentSessionId = url.searchParams.get("currentSessionId")?.trim() ?? "";
  const visitCountParam = Number(url.searchParams.get("visitCount") || 0);

  if (!visitorId) {
    return NextResponse.json({ error: "visitorId required" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const visitorSnap = await db.collection("analyticsVisitors").doc(visitorId).get();
    const visitorData = visitorSnap.exists
      ? (visitorSnap.data() as Record<string, unknown>)
      : null;

    const visitCount = Math.max(
      1,
      Math.round(
        visitCountParam ||
          Number(visitorData?.visitCount) ||
          0,
      ),
    );
    const storedHistory = sanitizeVisitHistory(visitorData?.visitHistory);

    const sessionIds = new Set<string>();
    for (const entry of storedHistory) {
      if (entry.sessionId) sessionIds.add(entry.sessionId);
    }
    if (currentSessionId) sessionIds.add(currentSessionId);

    const sessionDataById = new Map<string, Record<string, unknown>>();
    if (sessionIds.size > 0) {
      const refs = [...sessionIds].map((id) =>
        db.collection("analyticsSessions").doc(id),
      );
      const snaps = await db.getAll(...refs);
      for (const snap of snaps) {
        if (snap.exists) {
          sessionDataById.set(snap.id, snap.data() as Record<string, unknown>);
        }
      }
    }

    const bySession = new Map<string, VisitPayload>();

    for (const entry of storedHistory) {
      const sid = entry.sessionId;
      if (!sid) continue;
      const sess = sessionDataById.get(sid);
      const at = entry.at || tsToIso(sess?.firstSeenAt) || "";
      const atMs = at ? Date.parse(at) : 0;
      bySession.set(sid, {
        sessionId: sid,
        at,
        durationMs: sess ? sessionDurationMs(sess) : 0,
        geoLine:
          entry.geoLine ||
          (sess ? geoLineFrom(sess) : "") ||
          [entry.geoCity, entry.geoRegionName, entry.geoCountryName]
            .filter(Boolean)
            .join(", "),
        deviceModel: entry.deviceModel || String(sess?.deviceModel ?? ""),
        deviceLabel: entry.deviceLabel || String(sess?.deviceLabel ?? ""),
        landingPath:
          entry.landingPath ||
          String(sess?.landingPath ?? sess?.lastPath ?? ""),
        isCurrent: sid === currentSessionId,
      });
      if (atMs && sess) {
        bySession.get(sid)!.at =
          at || tsToIso(sess.firstSeenAt) || bySession.get(sid)!.at;
      }
    }

    if (storedHistory.length === 0) {
      const sessionsSnap = await db
        .collection("analyticsSessions")
        .where("visitorId", "==", visitorId)
        .limit(Math.min(visitCount * 3, 60))
        .get();

      for (const doc of sessionsSnap.docs) {
        const data = doc.data() as Record<string, unknown>;
        const sid = String(data.sessionId ?? doc.id);
        if (!sid || bySession.has(sid)) continue;
        bySession.set(
          sid,
          visitFromSession(data, sid, sid === currentSessionId),
        );
      }
    }

    if (
      currentSessionId &&
      !bySession.has(currentSessionId) &&
      sessionDataById.has(currentSessionId)
    ) {
      bySession.set(
        currentSessionId,
        visitFromSession(
          sessionDataById.get(currentSessionId)!,
          currentSessionId,
          true,
        ),
      );
    }

    const visits = [...bySession.values()]
      .sort((a, b) => Date.parse(b.at || "") - Date.parse(a.at || ""))
      .slice(0, visitCount)
      .map((v) => ({
        ...v,
        isCurrent: v.sessionId === currentSessionId,
      }));

    return NextResponse.json({ visits, visitCount });
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
