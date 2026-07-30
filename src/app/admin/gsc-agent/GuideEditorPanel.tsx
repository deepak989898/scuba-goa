"use client";

import type { SeoPageFirestore } from "@/lib/seo-page-firestore";

type Props = {
  editing: SeoPageFirestore;
  busy: string | null;
  onChangeEditing: (page: SeoPageFirestore) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onUploadImage: (file: File | null, kind: "og" | "hero") => void;
  onGenerateContent?: () => void;
  generatingContent?: boolean;
};

export function GuideEditorPanel({
  editing,
  busy,
  onChangeEditing,
  onSave,
  onCancelEdit,
  onUploadImage,
  onGenerateContent,
  generatingContent = false,
}: Props) {
  const saveBusy = busy === `save-${editing.slug}`;
  const imgBusy = busy === `img-og-${editing.slug}` || busy === `img-hero-${editing.slug}`;

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ocean-700">
        Edit guide page
      </p>
      <div className="grid gap-2.5 lg:grid-cols-2">
        <label className="block text-sm text-ocean-800 lg:col-span-2">
          Headline
          <input
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
            value={editing.headline}
            onChange={(e) =>
              onChangeEditing({ ...editing, headline: e.target.value })
            }
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
        <label className="block text-sm text-ocean-800">
          Booking option (optional)
          <input
            className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
            value={editing.bookingOption}
            onChange={(e) =>
              onChangeEditing({ ...editing, bookingOption: e.target.value })
            }
            placeholder="e.g. scuba-diving"
          />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-ocean-800">
          <input
            type="checkbox"
            checked={editing.published}
            onChange={(e) =>
              onChangeEditing({ ...editing, published: e.target.checked })
            }
          />
          Published
        </label>
        <label className="block text-sm text-ocean-800 lg:col-span-2">
          Body content (markdown)
          <textarea
            className="mt-1 min-h-[200px] w-full rounded-lg border border-ocean-200 px-3 py-2 font-mono text-sm"
            value={editing.bodyContent}
            onChange={(e) =>
              onChangeEditing({ ...editing, bodyContent: e.target.value })
            }
          />
        </label>

        <div className="lg:col-span-2">
          <p className="text-sm font-medium text-ocean-800">OG / share image</p>
          {editing.ogImageUrl ? (
            <div className="mt-2 flex flex-wrap items-start gap-2.5">
              <a
                href={editing.ogImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block h-24 w-40 overflow-hidden rounded-xl border border-ocean-200 bg-ocean-50 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editing.ogImageUrl}
                  alt="OG"
                  className="h-full w-full object-cover"
                />
              </a>
              <a
                href={editing.ogImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-cyan-800 underline"
              >
                View OG image
              </a>
            </div>
          ) : (
            <p className="mt-2 text-xs text-ocean-500">No OG image yet.</p>
          )}
          <input
            type="url"
            className="mt-2 w-full rounded-lg border border-ocean-200 px-3 py-2 text-sm"
            value={editing.ogImageUrl}
            onChange={(e) =>
              onChangeEditing({ ...editing, ogImageUrl: e.target.value })
            }
            placeholder="https://…"
          />
          <input
            type="file"
            accept="image/*"
            className="mt-2 block w-full text-sm"
            disabled={imgBusy || saveBusy}
            onChange={(e) =>
              onUploadImage(e.target.files?.[0] ?? null, "og")
            }
          />
          {busy === `img-og-${editing.slug}` ? (
            <p className="mt-1 text-xs font-semibold text-cyan-800">
              Uploading OG image…
            </p>
          ) : null}
        </div>

        <div className="lg:col-span-2">
          <p className="text-sm font-medium text-ocean-800">
            Hero image (optional — top of page)
          </p>
          {editing.heroImageUrl ? (
            <div className="mt-2 flex flex-wrap items-start gap-2.5">
              <a
                href={editing.heroImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block h-24 w-40 overflow-hidden rounded-xl border border-ocean-200 bg-ocean-50 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editing.heroImageUrl}
                  alt="Hero"
                  className="h-full w-full object-cover"
                />
              </a>
              <a
                href={editing.heroImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-cyan-800 underline"
              >
                View hero image
              </a>
            </div>
          ) : (
            <p className="mt-2 text-xs text-ocean-500">No hero image yet.</p>
          )}
          <input
            type="url"
            className="mt-2 w-full rounded-lg border border-ocean-200 px-3 py-2 text-sm"
            value={editing.heroImageUrl}
            onChange={(e) =>
              onChangeEditing({ ...editing, heroImageUrl: e.target.value })
            }
            placeholder="https://…"
          />
          <input
            type="file"
            accept="image/*"
            className="mt-2 block w-full text-sm"
            disabled={imgBusy || saveBusy}
            onChange={(e) =>
              onUploadImage(e.target.files?.[0] ?? null, "hero")
            }
          />
          {busy === `img-hero-${editing.slug}` ? (
            <p className="mt-1 text-xs font-semibold text-cyan-800">
              Uploading hero image…
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saveBusy || generatingContent}
          onClick={onSave}
          className="rounded-full bg-ocean-gradient px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saveBusy ? "Saving…" : "Save changes"}
        </button>
        {onGenerateContent ? (
          <button
            type="button"
            disabled={saveBusy || generatingContent}
            onClick={onGenerateContent}
            className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {generatingContent
              ? "Generating content…"
              : "Generate content (no image)"}
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
