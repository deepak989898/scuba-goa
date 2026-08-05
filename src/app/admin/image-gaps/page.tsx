"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import {
  isAdminUploadedImage,
  isStockFallbackImage,
} from "@/lib/cms-image";

type GapRow = {
  area: string;
  id: string;
  title: string;
  field: string;
  status: "missing" | "stock";
  href: string;
};

function classify(url: string): "ok" | "missing" | "stock" {
  const t = url.trim();
  if (!t) return "missing";
  if (isStockFallbackImage(t)) return "stock";
  if (isAdminUploadedImage(t)) return "ok";
  // Non-stock remote (pasted CDN) counts as filled for ops
  if (/^https?:\/\//i.test(t)) return "ok";
  return "missing";
}

export default function AdminImageGapsPage() {
  const db = getDb();
  const [rows, setRows] = useState<GapRow[]>([]);
  const [loading, setLoading] = useState(true);

  const scan = useCallback(async () => {
    if (!db) return;
    const gaps: GapRow[] = [];

    const services = await getDocs(collection(db, "services"));
    for (const d of services.docs) {
      const x = d.data() as Record<string, unknown>;
      if (x.active === false) continue;
      const title = String(x.title ?? d.id);
      const image = String(x.image ?? "");
      const st = classify(image);
      if (st !== "ok") {
        gaps.push({
          area: "Service",
          id: d.id,
          title,
          field: "image",
          status: st,
          href: "/admin/services",
        });
      }
    }

    const packages = await getDocs(collection(db, "packages"));
    for (const d of packages.docs) {
      const x = d.data() as Record<string, unknown>;
      if (x.active === false) continue;
      const title = String(x.name ?? d.id);
      const st = classify(String(x.imageUrl ?? ""));
      if (st !== "ok") {
        gaps.push({
          area: "Package",
          id: d.id,
          title,
          field: "imageUrl",
          status: st,
          href: "/admin/packages",
        });
      }
    }

    const hero = await getDocs(collection(db, "heroSlides"));
    for (const d of hero.docs) {
      const x = d.data() as Record<string, unknown>;
      const video = String(x.videoUrl ?? "").trim();
      const image = String(x.imageUrl ?? "");
      const st = classify(image);
      // Video-only slides are fine without an image; stock image still flagged.
      if (st === "stock" || (st === "missing" && !video)) {
        gaps.push({
          area: "Hero",
          id: d.id,
          title: String(x.alt ?? d.id),
          field: "imageUrl",
          status: st === "stock" ? "stock" : "missing",
          href: "/admin/hero",
        });
      }
    }

    const gallery = await getDocs(collection(db, "homeGallery"));
    for (const d of gallery.docs) {
      const x = d.data() as Record<string, unknown>;
      const type = String(x.type ?? "image").toLowerCase();
      const media = String(x.mediaUrl ?? x.imageUrl ?? "");
      if (type === "video") continue;
      const st = classify(media);
      if (st !== "ok") {
        gaps.push({
          area: "Gallery",
          id: d.id,
          title: String(x.alt ?? d.id),
          field: "mediaUrl",
          status: st,
          href: "/admin/gallery",
        });
      }
    }

    const blogs = await getDocs(collection(db, "blogPosts"));
    for (const d of blogs.docs) {
      const x = d.data() as Record<string, unknown>;
      if (x.published === false) continue;
      const featured = String(x.featuredImageUrl ?? "");
      const og = String(x.ogImageUrl ?? "");
      const st = classify(featured);
      const stOg = classify(og);
      if (st !== "ok" && stOg !== "ok") {
        gaps.push({
          area: "Blog",
          id: d.id,
          title: String(x.title ?? x.slug ?? d.id),
          field: "featuredImageUrl",
          status: st === "stock" || stOg === "stock" ? "stock" : "missing",
          href: "/admin/blog-automation",
        });
      }
    }

    gaps.sort((a, b) =>
      a.area.localeCompare(b.area) || a.title.localeCompare(b.title),
    );
    setRows(gaps);
  }, [db]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    scan().finally(() => setLoading(false));
  }, [db, scan]);

  if (!db) {
    return (
      <p className="text-sm text-ocean-700">Firebase client not configured.</p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ocean-900">
            Image gaps
          </h1>
          <p className="mt-1 text-sm text-ocean-700">
            Entities missing an admin Storage image, or still on Unsplash stock.
            This list never overwrites existing uploads — open the link and
            upload WebP there.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            scan().finally(() => setLoading(false));
          }}
          className="rounded-full border border-ocean-300 px-4 py-1.5 text-xs font-semibold text-ocean-800 disabled:opacity-50"
        >
          {loading ? "Scanning…" : "Rescan"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-ocean-600">Scanning Firestore…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          No gaps found — every checked entity has a non-stock image.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ocean-100 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ocean-100 text-ocean-800">
              <tr>
                <th className="p-3">Area</th>
                <th className="p-3">Title</th>
                <th className="p-3">Field</th>
                <th className="p-3">Status</th>
                <th className="p-3">Fix</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.area}-${r.id}-${r.field}`}
                  className="border-b border-ocean-50"
                >
                  <td className="p-3 font-medium text-ocean-900">{r.area}</td>
                  <td className="max-w-[14rem] p-3 text-ocean-800">{r.title}</td>
                  <td className="p-3 font-mono text-xs text-ocean-600">
                    {r.field}
                  </td>
                  <td className="p-3">
                    {r.status === "stock" ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-900">
                        Stock / Unsplash
                      </span>
                    ) : (
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-800">
                        Missing
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <Link
                      href={r.href}
                      className="text-sm font-semibold text-cyan-800 underline"
                    >
                      Open admin
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-ocean-100 px-3 py-2 text-xs text-ocean-600">
            {rows.length} gap{rows.length === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}
