import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/lib/firebase-admin";

export type ParsedGcsObject = {
  bucket: string;
  objectPath: string;
};

/** Parse Firebase Storage or GCS HTTPS URLs into bucket + object path. */
export function parseGcsObjectFromUrl(url: string): ParsedGcsObject | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    let path = u.pathname;
    try {
      path = decodeURIComponent(path);
    } catch {
      /* keep encoded path */
    }

    const firebase = path.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/i);
    if (host.includes("firebasestorage.googleapis.com") && firebase) {
      let objectPath = firebase[2];
      try {
        objectPath = decodeURIComponent(objectPath);
      } catch {
        /* keep */
      }
      return { bucket: firebase[1], objectPath };
    }

    if (host === "storage.googleapis.com") {
      const rest = path.replace(/^\//, "");
      const slash = rest.indexOf("/");
      if (slash > 0) {
        const bucket = rest.slice(0, slash);
        let objectPath = rest.slice(slash + 1);
        try {
          objectPath = decodeURIComponent(objectPath);
        } catch {
          /* keep */
        }
        return { bucket, objectPath };
      }
    }
  } catch {
    return null;
  }
  return null;
}

export async function downloadMediaBytes(url: string): Promise<Buffer> {
  const parsed = parseGcsObjectFromUrl(url);
  const app = getAdminApp();
  if (parsed && app) {
    const bucket = getStorage(app).bucket(parsed.bucket);
    const [buf] = await bucket.file(parsed.objectPath).download();
    return buf;
  }

  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Could not fetch media (${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}
