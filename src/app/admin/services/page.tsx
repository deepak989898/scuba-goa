"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { docToService, serviceToPayload } from "@/lib/service-firestore";
import type { ServiceItem, SubServiceItem } from "@/data/services";

type SubServiceFormRow = {
  title: string;
  description: string;
  priceFrom: string;
  includes: string;
};

const emptySubRow = (): SubServiceFormRow => ({
  title: "",
  description: "",
  priceFrom: "",
  includes: "",
});

export default function AdminServicesPage() {
  const db = getDb();
  const [list, setList] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [subRows, setSubRows] = useState<SubServiceFormRow[]>([]);

  const empty = {
    slug: "",
    title: "",
    short: "",
    priceFrom: 1999,
    image: "",
    duration: "Half day",
    rating: 4.8,
    includes: "Pickup, Guide, Water",
    slotsLeft: 8,
    bookedToday: 3,
    sortOrder: 0,
    limitedSlots: true,
    mostBooked: false,
    detailContent: "",
  };
  const [form, setForm] = useState(empty);

  const refresh = useCallback(async () => {
    if (!db) return;
    const snap = await getDocs(collection(db, "services"));
    const rows: ServiceItem[] = [];
    for (const d of snap.docs) {
      const s = docToService(d.id, d.data() as Record<string, unknown>);
      if (s) rows.push(s);
    }
    rows.sort(
      (a, b) =>
        (a.sortOrder ?? 999) - (b.sortOrder ?? 999) ||
        a.slug.localeCompare(b.slug)
    );
    setList(rows);
  }, [db]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [db, refresh]);

  function startEdit(s: ServiceItem) {
    setEditingSlug(s.slug);
    setForm({
      slug: s.slug,
      title: s.title,
      short: s.short,
      priceFrom: s.priceFrom,
      image: s.image,
      duration: s.duration,
      rating: s.rating,
      includes: s.includes.join(", "),
      slotsLeft: s.slotsLeft ?? 0,
      bookedToday: s.bookedToday ?? 0,
      sortOrder: s.sortOrder ?? 0,
      limitedSlots: s.limitedSlots ?? false,
      mostBooked: s.mostBooked ?? false,
      detailContent: s.detailContent ?? "",
    });
    setSubRows(
      s.subServices?.map((sub) => ({
        title: sub.title,
        description: sub.description ?? "",
        priceFrom:
          sub.priceFrom != null && Number.isFinite(sub.priceFrom)
            ? String(sub.priceFrom)
            : "",
        includes: sub.includes?.join(", ") ?? "",
      })) ?? []
    );
  }

  async function save() {
    if (!db) return;
    setFormError(null);
    const slug = form.slug.trim().toLowerCase().replace(/\s+/g, "-");
    if (!slug || !form.title.trim()) {
      setFormError("Slug and title are required.");
      return;
    }
    const subServices: SubServiceItem[] | undefined = (() => {
      const rows: SubServiceItem[] = [];
      for (const r of subRows) {
        const title = r.title.trim();
        if (!title) continue;
        let priceFrom: number | undefined;
        if (r.priceFrom.trim() !== "") {
          const n = Number(r.priceFrom);
          priceFrom = Number.isFinite(n) ? n : undefined;
        }
        const inc = r.includes
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        rows.push({
          title,
          description: r.description.trim() || undefined,
          priceFrom,
          includes: inc.length ? inc : undefined,
        });
      }
      return rows.length ? rows : undefined;
    })();

    const item: ServiceItem & { sortOrder: number } = {
      slug,
      title: form.title.trim(),
      short: form.short.trim(),
      priceFrom: Number(form.priceFrom),
      image: form.image.trim(),
      duration: form.duration.trim(),
      rating: Number(form.rating),
      includes: form.includes
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      slotsLeft: Number(form.slotsLeft),
      bookedToday: Number(form.bookedToday),
      limitedSlots: form.limitedSlots,
      mostBooked: form.mostBooked,
      sortOrder: Number(form.sortOrder),
      detailContent: form.detailContent.trim() || undefined,
      subServices,
    };
    const payload = serviceToPayload(item);
    if (editingSlug && editingSlug !== slug) {
      if (
        !confirm(
          "Slug changed — this creates a new page and leaves the old doc. Continue?"
        )
      )
        return;
      await deleteDoc(doc(db, "services", editingSlug));
    }
    await setDoc(doc(db, "services", slug), payload);
    setForm(empty);
    setSubRows([]);
    setEditingSlug(null);
    await refresh();
  }

  async function remove(slug: string) {
    if (!db || !confirm(`Delete service "${slug}"?`)) return;
    await deleteDoc(doc(db, "services", slug));
    await refresh();
  }

  if (!db) {
    return (
      <p className="text-ocean-700">
        Firebase client not configured. Add NEXT_PUBLIC_FIREBASE_* variables.
      </p>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ocean-900">Services</h1>
      <p className="mt-2 text-sm text-ocean-600">
        Home page &amp; /services cards. Document ID = URL slug (e.g.{" "}
        <code className="text-xs">scuba-diving</code>). If this list is empty, the
        site uses built-in defaults from code until you add rows here.
      </p>

      <div className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-ocean-900">
          {editingSlug ? `Edit service (${editingSlug})` : "Add service"}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className={`text-sm ${editingSlug ? "opacity-60" : ""}`}>
            Slug (URL) — lowercase-with-hyphens
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.slug}
              disabled={Boolean(editingSlug)}
              onChange={(e) =>
                setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))
              }
              placeholder="scuba-diving"
            />
          </label>
          <label className="text-sm">
            Sort order (0 = first)
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
              }
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Title
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Short description
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.short}
              onChange={(e) => setForm((f) => ({ ...f, short: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            Price from (INR)
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.priceFrom}
              onChange={(e) =>
                setForm((f) => ({ ...f, priceFrom: Number(e.target.value) }))
              }
            />
          </label>
          <label className="text-sm">
            Duration
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.duration}
              onChange={(e) =>
                setForm((f) => ({ ...f, duration: e.target.value }))
              }
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Image URL
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              placeholder="https://… (direct link to .jpg / .webp etc.)"
            />
            <span className="mt-1 block text-xs text-ocean-600">
              Use a full <code className="text-[10px]">https://</code> URL. Any host
              works; for files in <code className="text-[10px]">/public</code> use a
              path like <code className="text-[10px]">/your-file.jpg</code>.
            </span>
          </label>
          <label className="text-sm">
            Rating
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.rating}
              onChange={(e) =>
                setForm((f) => ({ ...f, rating: Number(e.target.value) }))
              }
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Includes (comma-separated)
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.includes}
              onChange={(e) =>
                setForm((f) => ({ ...f, includes: e.target.value }))
              }
            />
            <span className="mt-1 block text-xs text-ocean-600">
              All items show on cards and detail; separate with commas.
            </span>
          </label>
          <label className="text-sm sm:col-span-2">
            Detail page copy
            <textarea
              rows={6}
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2 font-sans text-sm"
              value={form.detailContent}
              onChange={(e) =>
                setForm((f) => ({ ...f, detailContent: e.target.value }))
              }
              placeholder="Shown on /services/your-slug. Leave blank to use the default text. Use a blank line between paragraphs."
            />
          </label>
          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-ocean-900">
                Sub-services (detail page)
              </span>
              <button
                type="button"
                className="rounded-lg border border-ocean-200 px-3 py-1.5 text-xs font-semibold text-ocean-800 hover:bg-ocean-50"
                onClick={() => setSubRows((rows) => [...rows, emptySubRow()])}
              >
                Add sub-service
              </button>
            </div>
            <p className="mt-1 text-xs text-ocean-600">
              Optional variants or add-ons listed under &quot;Options &amp; add-ons&quot; on
              the service detail page.
            </p>
            <ul className="mt-3 space-y-4">
              {subRows.map((row, idx) => (
                <li
                  key={idx}
                  className="rounded-xl border border-ocean-100 bg-ocean-50/50 p-4"
                >
                  <div className="mb-2 flex justify-end">
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-600 hover:underline"
                      onClick={() =>
                        setSubRows((rows) => rows.filter((_, i) => i !== idx))
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm sm:col-span-2">
                      Title
                      <input
                        className="mt-1 w-full rounded-lg border border-ocean-200 bg-white px-2 py-2"
                        value={row.title}
                        onChange={(e) =>
                          setSubRows((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, title: e.target.value } : r
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-sm sm:col-span-2">
                      Description
                      <textarea
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-ocean-200 bg-white px-2 py-2 text-sm"
                        value={row.description}
                        onChange={(e) =>
                          setSubRows((rows) =>
                            rows.map((r, i) =>
                              i === idx
                                ? { ...r, description: e.target.value }
                                : r
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-sm">
                      From price (INR, optional)
                      <input
                        type="number"
                        className="mt-1 w-full rounded-lg border border-ocean-200 bg-white px-2 py-2"
                        value={row.priceFrom}
                        onChange={(e) =>
                          setSubRows((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, priceFrom: e.target.value } : r
                            )
                          )
                        }
                      />
                    </label>
                    <label className="text-sm sm:col-span-2">
                      Includes (comma-separated)
                      <input
                        className="mt-1 w-full rounded-lg border border-ocean-200 bg-white px-2 py-2"
                        value={row.includes}
                        onChange={(e) =>
                          setSubRows((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, includes: e.target.value } : r
                            )
                          )
                        }
                      />
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <label className="text-sm">
            Slots left
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.slotsLeft}
              onChange={(e) =>
                setForm((f) => ({ ...f, slotsLeft: Number(e.target.value) }))
              }
            />
          </label>
          <label className="text-sm">
            Booked today
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.bookedToday}
              onChange={(e) =>
                setForm((f) => ({ ...f, bookedToday: Number(e.target.value) }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.limitedSlots}
              onChange={(e) =>
                setForm((f) => ({ ...f, limitedSlots: e.target.checked }))
              }
            />
            Limited slots badge
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.mostBooked}
              onChange={(e) =>
                setForm((f) => ({ ...f, mostBooked: e.target.checked }))
              }
            />
            Most booked badge
          </label>
        </div>
        {formError ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            className="min-h-11 rounded-full bg-ocean-800 px-5 py-2 text-sm font-semibold text-white"
          >
            {editingSlug ? "Update" : "Add"}
          </button>
          {editingSlug ? (
            <button
              type="button"
              onClick={() => {
                setEditingSlug(null);
                setForm(empty);
                setSubRows([]);
              }}
              className="min-h-11 rounded-full border border-ocean-200 px-5 py-2 text-sm font-semibold text-ocean-800"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-ocean-100 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-ocean-600">Loading…</p>
        ) : list.length === 0 ? (
          <p className="p-6 text-ocean-600">
            No Firestore documents — website shows default services from code. Add one
            above to override.
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ocean-100 bg-ocean-50 text-ocean-800">
              <tr>
                <th className="p-3">Slug</th>
                <th className="p-3">Title</th>
                <th className="p-3">From ₹</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.slug} className="border-b border-ocean-50">
                  <td className="p-3 font-mono text-xs text-ocean-700">{s.slug}</td>
                  <td className="p-3 font-medium text-ocean-900">{s.title}</td>
                  <td className="p-3">{s.priceFrom}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="text-ocean-600 hover:underline"
                      onClick={() => startEdit(s)}
                    >
                      Edit
                    </button>
                    <span className="mx-2 text-ocean-300">|</span>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => remove(s.slug)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
