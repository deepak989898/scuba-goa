import { NextResponse } from "next/server";
import { authenticateAdminRequest } from "@/lib/admin-request-auth";
import {
  getGscConnectionPublic,
  listGscSites,
  saveSeoSettings,
} from "@/lib/gsc-indexing-agent";
import { saveGscConnection } from "@/lib/gsc-indexing-agent/connection";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const connection = await getGscConnectionPublic();
  const sites = await listGscSites();
  return NextResponse.json({
    connection,
    sites: sites.ok ? sites.sites : [],
    sitesError: sites.ok ? null : sites.error,
  });
}

export async function POST(req: Request) {
  const auth = await authenticateAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  let body: { propertyUri?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const propertyUri = String(body.propertyUri || "").trim();
  if (!propertyUri) {
    return NextResponse.json({ error: "propertyUri required" }, { status: 400 });
  }
  const normalized = propertyUri.endsWith("/") ? propertyUri : `${propertyUri}/`;
  await saveSeoSettings({ propertyUri: normalized });
  await saveGscConnection({ propertyUri: normalized });
  return NextResponse.json({ ok: true, propertyUri: normalized });
}
