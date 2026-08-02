"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  AdminSingleImagePreview,
} from "@/components/admin/AdminMediaUrlPreview";
import { AdminWebpUploadButton } from "@/components/admin/AdminWebpUploadButton";
import { getDb } from "@/lib/firebase";
import { isAdminUploadedImage, isStockFallbackImage } from "@/lib/cms-image";

const DOC_PATH = "siteContent/about";

export default function AdminAboutPage() {
  const db = getDb();
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [midImageUrl, setMidImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!db) return;
    const snap = await getDoc(doc(db, "siteContent", "about"));
    if (!snap.exists()) {
      setHeroImageUrl("");
      setMidImageUrl("");
      return;
    }
    const x = snap.data() as Record<string, unknown>;
    const hero = String(x.heroImageUrl ?? "").trim();
    const mid = String(x.midImageUrl ?? "").trim();
    setHeroImageUrl(isStockFallbackImage(hero) ? "" : hero);
    setMidImageUrl(isStockFallbackImage(mid) ? "" : mid);
  }, [db]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [db, refresh]);

  async function save() {
    if (!db) return;
    setSaving(true);
    setMsg(null);
    try {
      await setDoc(
        doc(db, "siteContent", "about"),
        {
          heroImageUrl: heroImageUrl.trim(),
          midImageUrl: midImageUrl.trim(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      setMsg("Saved. Public /about will use these images after refresh.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!db) {
    return (
      <p className="text-sm text-ocean-700">
        Firebase client not configured. Check env vars.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-ocean-600">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ocean-900">
          About page images
        </h1>
        <p className="mt-1 text-sm text-ocean-700">
          Upload WebP photos for the About page. Stock Unsplash is never shown
          on the public site. Existing admin uploads are kept unless you replace
          them.
        </p>
      </div>

      <section className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
        <AdminSingleImagePreview
          label="Hero image"
          value={heroImageUrl}
          onChange={setHeroImageUrl}
          hint={
            isAdminUploadedImage(heroImageUrl)
              ? "Admin upload on file — leave as-is or replace with Upload."
              : "No admin image yet — upload a WebP."
          }
        />
        <AdminWebpUploadButton
          className="mt-2"
          folder="about"
          profile="hero"
          currentUrl={heroImageUrl}
          onUploaded={setHeroImageUrl}
          label="Upload hero WebP"
        />
      </section>

      <section className="rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
        <AdminSingleImagePreview
          label="Mid-page image"
          value={midImageUrl}
          onChange={setMidImageUrl}
          hint={
            isAdminUploadedImage(midImageUrl)
              ? "Admin upload on file — leave as-is or replace with Upload."
              : "No admin image yet — upload a WebP."
          }
        />
        <AdminWebpUploadButton
          className="mt-2"
          folder="about"
          profile="featured"
          currentUrl={midImageUrl}
          onUploaded={setMidImageUrl}
          label="Upload mid WebP"
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-full bg-ocean-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {msg ? <p className="text-sm text-ocean-700">{msg}</p> : null}
      </div>
    </div>
  );
}
