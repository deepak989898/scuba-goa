import type { HomeGalleryItem } from "@/lib/home-gallery-default";

/** Hamming distance between equal-length hex hashes (client-safe). */
function hammingHex(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 999;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const x = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    dist += [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4][x] ?? 4;
  }
  return dist;
}

/** Near-duplicate perceptual hashes (≈ small visual edits / recompress). */
const PHASH_NEAR_DUP_MAX = 10;

/**
 * Normalize media URLs so the same file with different hosts, query params,
 * or encodings counts as one gallery item.
 */
export function galleryMediaDedupeKey(url: string): string {
  const raw = url.trim();
  if (!raw) return "";

  try {
    const u = new URL(raw);

    // Next.js image optimizer — unwrap inner URL
    if (u.pathname.includes("/_next/image")) {
      const inner = u.searchParams.get("url");
      if (inner) return galleryMediaDedupeKey(decodeURIComponent(inner));
    }

    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    let path = u.pathname.replace(/\/+$/, "") || "/";
    try {
      path = decodeURIComponent(path);
    } catch {
      /* keep encoded path */
    }
    path = path.replace(/\/{2,}/g, "/");

    // Firebase Storage download URL → gs:bucket/object (decode object path)
    const fb = path.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/i);
    if (host.includes("firebasestorage.googleapis.com") && fb) {
      let objectPath = fb[2];
      try {
        objectPath = decodeURIComponent(objectPath);
      } catch {
        /* keep */
      }
      return `gs:${fb[1]}/${objectPath}`.toLowerCase();
    }

    // https://storage.googleapis.com/{bucket}/{object}
    if (host === "storage.googleapis.com") {
      let rest = path.replace(/^\//, "");
      try {
        rest = decodeURIComponent(rest);
      } catch {
        /* keep */
      }
      if (rest.includes("/")) {
        return `gs:${rest}`.toLowerCase();
      }
    }

    // Unsplash: /photo-xxx is the identity
    if (host.includes("unsplash.com") || host.includes("images.unsplash.com")) {
      const photo = path.match(/\/(photo-[a-z0-9_-]+)/i);
      if (photo) return `unsplash:${photo[1]}`.toLowerCase();
    }

    return `${host}${path}`.toLowerCase();
  } catch {
    return raw.split("?")[0].split("#")[0].trim().toLowerCase();
  }
}

type DedupeCapable = HomeGalleryItem & {
  sha256?: string;
  perceptualHash?: string;
};

function isNearDuplicatePhash(a: string, b: string): boolean {
  const aa = a.trim().toLowerCase();
  const bb = b.trim().toLowerCase();
  if (!aa || !bb) return false;
  if (aa === bb) return true;
  return hammingHex(aa, bb) <= PHASH_NEAR_DUP_MAX;
}

/** Collect all media URLs that identify this item (main + poster). */
function itemUrlKeys(item: DedupeCapable): string[] {
  const keys: string[] = [];
  const main = galleryMediaDedupeKey(item.mediaUrl || "");
  if (main) keys.push(main);
  const poster = galleryMediaDedupeKey(item.posterUrl || "");
  if (poster) keys.push(poster);
  return keys;
}

/**
 * Keep first occurrence of each media file.
 * Same Firestore/Storage link (or same poster as another image) → skip.
 */
export function dedupeHomeGalleryItems<T extends DedupeCapable>(items: T[]): T[] {
  const seenUrl = new Set<string>();
  const seenSha = new Set<string>();
  const keptPhash: string[] = [];
  const out: T[] = [];

  for (const item of items) {
    const urlKeys = itemUrlKeys(item);
    const sha = item.sha256?.trim().toLowerCase() || "";
    const ph = item.perceptualHash?.trim().toLowerCase() || "";

    if (urlKeys.some((k) => seenUrl.has(k))) continue;
    if (sha && seenSha.has(sha)) continue;
    if (ph && keptPhash.some((prev) => isNearDuplicatePhash(prev, ph))) continue;

    for (const k of urlKeys) seenUrl.add(k);
    if (sha) seenSha.add(sha);
    if (ph) keptPhash.push(ph);
    out.push(item);
  }
  return out;
}
