/**
 * TripJack HMS calls via DigitalOcean static-IP proxy only.
 * TRIPJACK_API_KEY must live on the VPS — never on Vercel.
 */

const PROXY_PATHS = {
  listing: "/api/tripjack/hotels/listing",
  detail: "/api/tripjack/hotels/detail",
  pricing: "/api/tripjack/hotels/pricing",
  review: "/api/tripjack/hotels/review",
  fetchHotelMapping: "/api/tripjack/hotels/fetch-hotel-mapping",
  fetchHotelContent: "/api/tripjack/hotels/fetch-hotel-content",
  nationalities: "/api/tripjack/hotels/nationalities",
} as const;

export type ProxyRoute = keyof typeof PROXY_PATHS;

function proxyBaseUrl(): string | null {
  const raw = process.env.TRIPJACK_PROXY_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export function isTripjackProxyConfigured(): boolean {
  return Boolean(proxyBaseUrl());
}

export function isHotelsModuleEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_TRIPJACK_HOTELS_ENABLED === "false") return false;
  return process.env.NEXT_PUBLIC_TRIPJACK_HOTELS_ENABLED === "true" || isTripjackProxyConfigured();
}

export async function tripjackProxyPost<T = Record<string, unknown>>(
  route: ProxyRoute,
  payload: Record<string, unknown>,
  opts?: { timeoutMs?: number },
): Promise<T> {
  const base = proxyBaseUrl();
  if (!base) {
    throw new Error("Hotel supplier connection is not configured yet. Showing saved prices.");
  }

  const path = PROXY_PATHS[route];
  const url = `${base}${path}`;
  const timeoutMs = opts?.timeoutMs ?? 45000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      const msg =
        typeof data?.error === "string"
          ? data.error
          : `Hotel supplier request failed (${res.status})`;
      throw new Error(msg);
    }
    return data as T;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Hotel supplier timed out. Try again or use saved prices.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function tripjackProxyGet<T = Record<string, unknown>>(
  route: ProxyRoute,
  opts?: { timeoutMs?: number },
): Promise<T> {
  const base = proxyBaseUrl();
  if (!base) {
    throw new Error("Hotel supplier connection is not configured yet.");
  }
  const path = PROXY_PATHS[route];
  const url = `${base}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 30000);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      throw new Error(
        typeof data?.error === "string" ? data.error : `Request failed (${res.status})`,
      );
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}
