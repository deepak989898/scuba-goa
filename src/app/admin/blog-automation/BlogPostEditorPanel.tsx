"use client";

import type { BlogLanguage, BlogPostFirestore } from "@/lib/blog-firestore";
import {
  formatUtcInIst,
  utcIsoToIstDatetimeLocalValue,
} from "@/lib/blog-automation/schedule-ist";

type ServiceOption = { slug: string; title: string };

type Props = {
  editing: BlogPostFirestore;
  busy: string | null;
  publishSlots: string[];
  aiImageProgress?: number | null;
  services?: ServiceOption[];
  onChangeEditing: (post: BlogPostFirestore) => void;
  onSave: (opts?: { publishNow?: boolean }) => void;
  onCancelEdit: () => void;
  onUploadImage: (file: File | null) => void;
  onGenerateAiImage: () => void;
  onGenerateStockImage?: () => void;
};

export function BlogPostEditorPanel({
  editing,
  busy,
  publishSlots,
  aiImageProgress = null,
  services = [],
  onChangeEditing,
  onSave,
  onCancelEdit,
  onUploadImage,
  onGenerateAiImage,
  onGenerateStockImage,
}: Props) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ocean-700">
        Edit blog post
      </p>
      <div className="grid gap-2.5 lg:grid-cols-2">
        <label className="block text-sm text-ocean-800">
          Title
          <input
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
            value={editing.title}
            onChange={(e) =>
              onChangeEditing({ ...editing, title: e.target.value })
            }
          />
        </label>
        <label className="block text-sm text-ocean-800">
          Language
          <select
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
            value={editing.language}
            onChange={(e) =>
              onChangeEditing({
                ...editing,
                language: e.target.value as BlogLanguage,
              })
            }
          >
            <option value="hinglish">Hinglish</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
        </label>
        <label className="block text-sm text-ocean-800 lg:col-span-2">
          Related service
          <select
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
            value={editing.serviceSlug || ""}
            onChange={(e) =>
              onChangeEditing({
                ...editing,
                serviceSlug: e.target.value,
              })
            }
          >
            <option value="">— Unassigned —</option>
            {editing.serviceSlug &&
            !services.some((s) => s.slug === editing.serviceSlug) ? (
              <option value={editing.serviceSlug}>
                {editing.serviceSlug} (current)
              </option>
            ) : null}
            {services.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-ocean-500">
            Used for the service filter — assign so you can see which services
            need more blogs.
          </span>
        </label>
        <label className="block text-sm text-ocean-800">
          IST slot
          <select
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
            value={editing.publishSlotIst ?? ""}
            onChange={(e) =>
              onChangeEditing({
                ...editing,
                publishSlotIst: e.target.value,
              })
            }
          >
            <option value="">—</option>
            {publishSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot} IST
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ocean-800">
          Schedule date (IST)
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
            value={editing.scheduleDateIst ?? editing.date}
            onChange={(e) =>
              onChangeEditing({
                ...editing,
                scheduleDateIst: e.target.value,
                date: e.target.value,
              })
            }
          />
        </label>
        <label className="block text-sm text-ocean-800 lg:col-span-2">
          Auto-publish at (IST)
          <input
            type="datetime-local"
            className="mt-1 w-full max-w-md rounded-lg border border-ocean-200 px-3 py-2"
            value={utcIsoToIstDatetimeLocalValue(editing.scheduledPublishAt)}
            onChange={(e) => {
              const v = e.target.value;
              onChangeEditing({
                ...editing,
                scheduledPublishAt: v
                  ? new Date(`${v}:00+05:30`).toISOString()
                  : undefined,
              });
            }}
          />
        </label>
        <label className="block text-sm text-ocean-800 lg:col-span-2">
          Meta title
          <input
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
            value={editing.metaTitle}
            onChange={(e) =>
              onChangeEditing({ ...editing, metaTitle: e.target.value })
            }
          />
        </label>
        <label className="block text-sm text-ocean-800 lg:col-span-2">
          Meta description
          <textarea
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
            rows={2}
            value={editing.metaDescription}
            onChange={(e) =>
              onChangeEditing({
                ...editing,
                metaDescription: e.target.value,
              })
            }
          />
        </label>
        <label className="block text-sm text-ocean-800 lg:col-span-2">
          Excerpt
          <textarea
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
            rows={2}
            value={editing.excerpt}
            onChange={(e) =>
              onChangeEditing({ ...editing, excerpt: e.target.value })
            }
          />
        </label>
        <label className="block text-sm text-ocean-800 lg:col-span-2">
          Keywords (comma separated)
          <input
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
            value={editing.keywords.join(", ")}
            onChange={(e) =>
              onChangeEditing({
                ...editing,
                keywords: e.target.value
                  .split(/,\s*/)
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <label className="block text-sm text-ocean-800 lg:col-span-2">
          Content (markdown)
          <textarea
            className="mt-1 min-h-[200px] w-full rounded-lg border border-ocean-200 px-3 py-2 font-mono text-sm"
            value={editing.content}
            onChange={(e) =>
              onChangeEditing({ ...editing, content: e.target.value })
            }
          />
        </label>
        <div className="lg:col-span-2">
          <p className="text-sm font-medium text-ocean-800">
            Featured image (WebP + top-left logo)
          </p>
          {editing.featuredImageUrl ? (
            <div className="mt-2 flex flex-wrap items-start gap-2.5">
              <a
                href={editing.featuredImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block h-24 w-40 overflow-hidden rounded-xl border border-ocean-200 bg-ocean-50 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    editing.featuredImageUrl.includes("?")
                      ? `${editing.featuredImageUrl}&v=${encodeURIComponent(editing.updatedAt || "")}`
                      : `${editing.featuredImageUrl}?v=${encodeURIComponent(editing.updatedAt || "")}`
                  }
                  alt={editing.featuredImageAlt || editing.title}
                  className="h-full w-full object-cover"
                />
              </a>
              <div className="text-xs text-ocean-600">
                <a
                  href={editing.featuredImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-cyan-800 underline"
                >
                  View current image
                </a>
                <p className="mt-1 max-w-sm">
                  Upload a file or use <strong>Generate with AI</strong> — either
                  saves a new WebP (logo top-left, no bottom bar) to the live blog
                  immediately.
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-ocean-500">
              No featured image yet — choose a file to upload.
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept="image/*"
              className="block min-w-0 flex-1 text-sm"
              disabled={
                busy === `img-${editing.slug}` ||
                busy === `ai-img-${editing.slug}`
              }
              onChange={(e) => {
                onUploadImage(e.target.files?.[0] ?? null);
                // Allow re-selecting the same file later
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={
                !editing.title.trim() ||
                busy === `img-${editing.slug}` ||
                busy === `ai-img-${editing.slug}` ||
                busy === `stock-img-${editing.slug}`
              }
              onClick={onGenerateAiImage}
              className="shrink-0 rounded-full bg-cyan-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-800 disabled:opacity-50 sm:text-sm"
            >
              {busy === `ai-img-${editing.slug}` && aiImageProgress != null
                ? `Generating… ${aiImageProgress}%`
                : busy === `ai-img-${editing.slug}`
                  ? "Generating AI image…"
                  : "Generate with AI"}
            </button>
            {onGenerateStockImage ? (
              <button
                type="button"
                disabled={
                  !editing.title.trim() ||
                  busy === `img-${editing.slug}` ||
                  busy === `ai-img-${editing.slug}` ||
                  busy === `stock-img-${editing.slug}`
                }
                onClick={onGenerateStockImage}
                className="shrink-0 rounded-full border border-emerald-600 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-100 disabled:opacity-50 sm:text-sm"
              >
                {busy === `stock-img-${editing.slug}`
                  ? "Fetching stock…"
                  : "Regenerate (free stock)"}
              </button>
            ) : null}
          </div>
          {busy === `ai-img-${editing.slug}` && aiImageProgress != null ? (
            <div className="mt-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-cyan-950">
                <span>AI image progress</span>
                <span className="tabular-nums">{aiImageProgress}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cyan-100">
                <div
                  className="h-full rounded-full bg-cyan-600 transition-[width] duration-300 ease-out"
                  style={{ width: `${aiImageProgress}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-cyan-800">
                Usually 20–60 seconds — please wait until 100%.
              </p>
            </div>
          ) : null}
          <p className="mt-1.5 text-xs text-ocean-500">
            Upload a file, regenerate with free stock (Pexels/Pixabay/Wikimedia), or
            generate with OpenAI (WebP + logo).
          </p>
        </div>
        {editing.publishedAt ? (
          <p className="text-sm text-ocean-600 lg:col-span-2">
            Published at (IST):{" "}
            <strong>{formatUtcInIst(editing.publishedAt, "long")}</strong>
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy === `save-${editing.slug}`}
          onClick={() => onSave()}
          className="rounded-full bg-ocean-gradient px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === `save-${editing.slug}` ? "Saving…" : "Save changes"}
        </button>
        {!editing.published ? (
          <button
            type="button"
            disabled={busy === `save-${editing.slug}`}
            onClick={() => onSave({ publishNow: true })}
            className="rounded-full border border-emerald-600 bg-emerald-50 px-5 py-2 text-sm font-semibold text-emerald-900 disabled:opacity-50"
          >
            Save & publish now
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-full border border-ocean-300 px-5 py-2 text-sm font-semibold text-ocean-800"
          onClick={onCancelEdit}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
