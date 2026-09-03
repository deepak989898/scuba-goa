import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  mapRawToCatalogDoc,
  upsertCatalogHotel,
  upsertGoaDestinationHids,
} from "@/lib/tripjack-hotels/catalog-store";
import { isGoaPlaceName } from "@/lib/tripjack-hotels/goa";
import { tripjackProxyPost } from "@/lib/tripjack-hotels/proxy-client";
import { getAdminDb } from "@/lib/firebase-admin";
import { HOTEL_FIRESTORE } from "@/lib/tripjack-hotels/types";

/**
 * Admin-only: sync TripJack hotel mapping/content into Firestore (Goa hotels).
 */
export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { limit?: number };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const limit = Math.min(500, Math.max(1, Number(body.limit) || 200));

  let mapping: Record<string, unknown> | null = null;
  try {
    mapping = await tripjackProxyPost("fetchHotelMapping", {
      destination: "Goa",
      country: "India",
      city: "Goa",
    });
  } catch (e) {
    console.error("mapping sync failed", e);
    return NextResponse.json(
      { error: "Could not fetch hotel mapping from supplier proxy." },
      { status: 502 },
    );
  }

  const hids: string[] = [];
  const hotelsRaw: unknown[] = [];

  const root = mapping ?? {};
  if (Array.isArray((root as { hotels?: unknown[] }).hotels)) {
    hotelsRaw.push(...((root as { hotels: unknown[] }).hotels));
  }
  if (Array.isArray((root as { data?: unknown[] }).data)) {
    hotelsRaw.push(...((root as { data: unknown[] }).data));
  }
  if (Array.isArray((root as { hids?: unknown[] }).hids)) {
    for (const h of (root as { hids: unknown[] }).hids) {
      if (typeof h === "string") hids.push(h);
      else if (h && typeof h === "object") {
        const o = h as Record<string, unknown>;
        const id = String(o.hid ?? o.id ?? o.hotelId ?? "").trim();
        if (id) hids.push(id);
      }
    }
  }

  for (const row of hotelsRaw.slice(0, limit)) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = String(o.hid ?? o.id ?? o.hotelId ?? o.tjHotelId ?? "").trim();
    if (!id) continue;
    hids.push(id);

    const city = String(o.city ?? o.cityName ?? o.destination ?? "").trim();
    if (!isGoaPlaceName(city) && !isGoaPlaceName(String(o.state ?? ""))) continue;

    const doc = mapRawToCatalogDoc(o, id);
    if (doc) {
      doc.websiteVisible = true;
      await upsertCatalogHotel(doc);
    }
  }

  const uniqueHids = [...new Set(hids)].slice(0, limit);
  await upsertGoaDestinationHids(uniqueHids);

  // Optional content enrichment batch
  let contentSynced = 0;
  for (const hid of uniqueHids.slice(0, Math.min(30, uniqueHids.length))) {
    try {
      const content = await tripjackProxyPost("fetchHotelContent", { hid, hotelId: hid });
      if (content && typeof content === "object") {
        const o = content as Record<string, unknown>;
        const inner =
          (o.data && typeof o.data === "object" ? o.data : o) as Record<string, unknown>;
        const doc = mapRawToCatalogDoc(inner, hid);
        if (doc) {
          doc.websiteVisible = true;
          await upsertCatalogHotel(doc);
          contentSynced += 1;
        }
      }
    } catch {
      /* continue batch */
    }
  }

  const db = getAdminDb();
  if (db) {
    await db.collection(HOTEL_FIRESTORE.catalogMeta).doc("sync").set(
      {
        lastSyncAt: new Date().toISOString(),
        hidsCount: uniqueHids.length,
        contentSynced,
        syncedBy: auth.uid,
      },
      { merge: true },
    );
  }

  return NextResponse.json({
    ok: true,
    hidsCount: uniqueHids.length,
    contentSynced,
    message: "Goa hotel catalog synced to Firestore.",
  });
}
