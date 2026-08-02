"use client";

import { useRef, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { isAdminUploadedImage } from "@/lib/cms-image";

type Props = {
  /** Storage folder prefix, e.g. `services/scuba-diving` or `packages` */
  folder: string;
  profile?: "hero" | "featured" | "card" | "og" | "thumbnail";
  /** Called with the new WebP download URL (never overwrites unless caller chooses). */
  onUploaded: (url: string) => void;
  /** When true, refuse replace if current value is already an admin Storage URL. */
  protectExisting?: boolean;
  currentUrl?: string;
  label?: string;
  className?: string;
};

/**
 * Upload a local image → server WebP compress → Firebase Storage URL.
 */
export function AdminWebpUploadButton({
  folder,
  profile = "card",
  onUploaded,
  protectExisting = true,
  currentUrl = "",
  label = "Upload WebP",
  className = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);

    if (protectExisting && isAdminUploadedImage(currentUrl)) {
      const ok = window.confirm(
        "This already has an admin-uploaded image. Replace it?",
      );
      if (!ok) {
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }

    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      let bearer: string | null = null;
      if (auth?.currentUser) {
        await auth.currentUser.getIdToken(true);
        bearer = await auth.currentUser.getIdToken();
      }
      if (!bearer) {
        throw new Error("Sign in again to upload.");
      }
      const fd = new FormData();
      fd.append("file", file);
      fd.append("profile", profile);
      fd.append("folder", folder);
      const res = await fetch("/api/admin/media-image-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${bearer}` },
        body: fd,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Upload failed");
      }
      onUploaded(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif"
        className="sr-only"
        onChange={(e) => void onPick(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded-full border border-cyan-600 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-900 disabled:opacity-50"
      >
        {busy ? "Uploading…" : label}
      </button>
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
