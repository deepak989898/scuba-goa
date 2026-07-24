"use client";

import { useState } from "react";
import { CmsRemoteImage } from "@/components/CmsRemoteImage";

function parseMediaUrls(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinMediaUrls(urls: string[]): string {
  return urls.join("\n");
}

type Props = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  kind: "image" | "video";
  placeholder?: string;
};

/**
 * Admin media list: show image/video previews instead of only raw URL textareas.
 * URLs can still be edited under “Edit as text”.
 */
export function AdminMediaUrlPreview({
  label,
  value,
  onChange,
  kind,
  placeholder,
}: Props) {
  const [showText, setShowText] = useState(false);
  const urls = parseMediaUrls(value);

  function removeAt(index: number) {
    onChange(joinMediaUrls(urls.filter((_, i) => i !== index)));
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-ocean-900">{label}</p>
        <button
          type="button"
          className="text-xs font-semibold text-ocean-700 underline-offset-2 hover:underline"
          onClick={() => setShowText((v) => !v)}
        >
          {showText ? "Hide URL text" : "Edit as text (URLs)"}
        </button>
      </div>

      {urls.length === 0 ? (
        <p className="mt-2 rounded-lg border border-dashed border-ocean-200 bg-white px-3 py-4 text-center text-xs text-ocean-500">
          No media yet — upload above or paste URLs via “Edit as text”.
        </p>
      ) : (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {urls.map((url, index) => (
            <li
              key={`${index}-${url.slice(0, 64)}`}
              className="relative overflow-hidden rounded-lg border border-ocean-200 bg-white shadow-sm"
            >
              <div className="relative aspect-video bg-ocean-100">
                {kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary storage URLs
                  <img
                    src={url}
                    alt={`${label} ${index + 1}`}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <video
                    src={url}
                    className="absolute inset-0 h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                    controls
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-ocean-100 px-2 py-1.5">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-[10px] text-ocean-600 hover:underline"
                  title={url}
                >
                  {url}
                </a>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showText ? (
        <textarea
          rows={3}
          className="mt-2 w-full rounded-lg border border-ocean-200 bg-white px-2 py-2 font-sans text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : null}
    </div>
  );
}

type SingleImageProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  placeholder?: string;
};

/** Single card/hero image with preview + URL field. */
export function AdminSingleImagePreview({
  label,
  value,
  onChange,
  hint,
  placeholder,
}: SingleImageProps) {
  const url = value.trim();
  return (
    <label className="text-sm sm:col-span-2">
      {label}
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
        {url ? (
          <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg border border-ocean-200 bg-ocean-100 sm:w-44">
            <CmsRemoteImage
              src={url}
              alt={label}
              fill
              className="object-cover"
              sizes="176px"
            />
          </div>
        ) : (
          <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-lg border border-dashed border-ocean-200 bg-ocean-50 text-xs text-ocean-500 sm:w-44">
            No image
          </div>
        )}
        <div className="min-w-0 flex-1">
          <input
            className="w-full rounded-lg border border-ocean-200 px-2 py-2"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
          {hint ? (
            <span className="mt-1 block text-xs text-ocean-700">{hint}</span>
          ) : null}
        </div>
      </div>
    </label>
  );
}
