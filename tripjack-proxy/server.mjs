/**
 * TripJack HMS proxy for DigitalOcean VPS (static IP).
 * Keep TRIPJACK_API_KEY only on this server — never on Vercel.
 *
 * Usage:
 *   cp .env.example .env
 *   npm install
 *   npm start
 */

import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 4000);
const API_KEY = process.env.TRIPJACK_API_KEY?.trim();
const HMS_BASE = (process.env.TRIPJACK_HOTEL_HMS_BASE || "https://apitest.tripjack.com").replace(
  /\/$/,
  "",
);

if (!API_KEY) {
  console.warn("[tripjack-proxy] TRIPJACK_API_KEY is not set — upstream calls will fail.");
}

async function forwardTripjack(
  upstreamPath: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; data: unknown }> {
  const url = `${HMS_BASE}${upstreamPath.startsWith("/") ? upstreamPath : `/${upstreamPath}`}`;
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      apikey: API_KEY ?? "",
      "api-key": API_KEY ?? "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  return { status: res.status, data };
}

function postRoute(
  path: string,
  upstreamPath: string,
) {
  app.post(path, async (req, res) => {
    try {
      const result = await forwardTripjack(upstreamPath, req.body as Record<string, unknown>);
      if (result.status >= 400) {
        return res.status(result.status).json({
          error: "Upstream hotel supplier error",
          upstreamStatus: result.status,
          data: result.data,
        });
      }
      return res.json(result.data);
    } catch (e) {
      console.error(`[tripjack-proxy] ${path}`, e);
      return res.status(502).json({ error: "Proxy forward failed" });
    }
  });
}

// Map proxy paths → TripJack HMS paths (adjust to your TripJack HMS contract)
postRoute("/api/tripjack/hotels/listing", "/hms/v1/hotel/search");
postRoute("/api/tripjack/hotels/detail", "/hms/v1/hotel/detail");
postRoute("/api/tripjack/hotels/pricing", "/hms/v1/hotel/price");
postRoute("/api/tripjack/hotels/review", "/hms/v1/hotel/review");
postRoute("/api/tripjack/hotels/fetch-hotel-mapping", "/hms/v1/hotel/mapping");
postRoute("/api/tripjack/hotels/fetch-hotel-content", "/hms/v1/hotel/content");
postRoute("/api/tripjack/hotels/nationalities", "/hms/v1/nationalities");

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "tripjack-proxy" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[tripjack-proxy] listening on :${PORT}`);
});
