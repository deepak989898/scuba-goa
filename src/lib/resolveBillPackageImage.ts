import { fallbackPackages } from "@/data/fallback-packages";
import { fallbackServices } from "@/data/services";
import { getPackageByIdServer } from "@/lib/get-packages-server";
import { getServiceBySlugServer } from "@/lib/get-services-server";

function pickImageUrl(raw: unknown): string | undefined {
  const t = String(raw ?? "").trim();
  if (!t) return undefined;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/") && !t.startsWith("//")) return t;
  return undefined;
}

async function imageFromCartItem(
  o: Record<string, unknown>,
): Promise<string | undefined> {
  const stored = pickImageUrl(o.image);
  if (stored) return stored;

  const kind = String(o.kind ?? "").trim();
  const refId = String(o.refId ?? "").trim();
  if (!refId) return undefined;

  if (kind === "package") {
    const pkg = await getPackageByIdServer(refId);
    const fromServer = pickImageUrl(pkg?.imageUrl);
    if (fromServer) return fromServer;
    const fallback = fallbackPackages.find((p) => p.id === refId);
    return pickImageUrl(fallback?.imageUrl);
  }

  const slug = refId.split("#")[0]?.trim() || "";
  if (!slug) return undefined;
  const service = await getServiceBySlugServer(slug);
  const fromServer = pickImageUrl(service?.image);
  if (fromServer) return fromServer;
  const fallback = fallbackServices.find((s) => s.slug === slug);
  return pickImageUrl(fallback?.image);
}

/** Resolve the best package/service thumbnail for invoice PDFs. */
export async function resolveBillPackageImageUrl(
  data: Record<string, unknown>,
): Promise<string | undefined> {
  const direct = pickImageUrl(data.packageImageUrl);
  if (direct) return direct;

  const cart = data.cartItems;
  if (Array.isArray(cart)) {
    for (const raw of cart) {
      if (!raw || typeof raw !== "object") continue;
      const url = await imageFromCartItem(raw as Record<string, unknown>);
      if (url) return url;
    }
  }

  const packageId = String(data.packageId ?? "").trim();
  if (packageId && packageId !== "cart") {
    const pkg = await getPackageByIdServer(packageId);
    const fromServer = pickImageUrl(pkg?.imageUrl);
    if (fromServer) return fromServer;
    const fallback = fallbackPackages.find((p) => p.id === packageId);
    const fromFallback = pickImageUrl(fallback?.imageUrl);
    if (fromFallback) return fromFallback;
  }

  const serviceSlug = String(data.serviceSlug ?? "").trim();
  if (serviceSlug) {
    const service = await getServiceBySlugServer(serviceSlug);
    const fromServer = pickImageUrl(service?.image);
    if (fromServer) return fromServer;
    const fallback = fallbackServices.find((s) => s.slug === serviceSlug);
    const fromFallback = pickImageUrl(fallback?.image);
    if (fromFallback) return fromFallback;
  }

  const packageName = String(data.packageName ?? "").trim().toLowerCase();
  if (packageName) {
    const byTitle = fallbackServices.find((s) => {
      const title = s.title.trim().toLowerCase();
      return title && (packageName === title || packageName.includes(title));
    });
    const fromTitle = pickImageUrl(byTitle?.image);
    if (fromTitle) return fromTitle;
  }

  if (Array.isArray(cart)) {
    for (const raw of cart) {
      if (!raw || typeof raw !== "object") continue;
      const name = String((raw as Record<string, unknown>).name ?? "")
        .trim()
        .toLowerCase();
      if (!name) continue;
      const byName = fallbackServices.find((s) => {
        const title = s.title.trim().toLowerCase();
        return title && (name === title || name.includes(title));
      });
      const fromName = pickImageUrl(byName?.image);
      if (fromName) return fromName;
    }
  }

  return undefined;
}
