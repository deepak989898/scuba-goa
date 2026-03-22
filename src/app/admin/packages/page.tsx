"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { parseFirestoreIncludes } from "@/lib/parse-firestore-includes";
import type { PackageDoc } from "@/lib/types";

export default function AdminPackagesPage() {
  const db = getDb();
  const [list, setList] = useState<PackageDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const triedAutoSeed = useRef(false);

  const empty = {
    name: "",
    price: 1999,
    duration: "Half day",
    includes: "Pickup, Guide, Water",
    rating: 4.8,
    slotsLeft: 8,
    bookedToday: 3,
    imageUrl: "",
    category: "Goa",
    isCombo: false,
    limitedSlots: true,
    discountPct: 0,
    active: true,
  };
  const [form, setForm] = useState(empty);

  const refresh = useCallback(async () => {
    if (!db) return;
    const snap = await getDocs(collection(db, "packages"));
    const rows = snap.docs.map((d) => {
      const x = d.data() as Record<string, unknown>;
      const imageTrim =
        x.imageUrl != null ? String(x.imageUrl).trim() : "";
      return {
        id: d.id,
        name: String(x.name ?? ""),
        price: Number(x.price ?? 0),
        duration: String(x.duration ?? ""),
        includes: parseFirestoreIncludes(x.includes),
        rating: Number(x.rating ?? 0),
        slotsLeft: x.slotsLeft != null ? Number(x.slotsLeft) : undefined,
        bookedToday: x.bookedToday != null ? Number(x.bookedToday) : undefined,
        imageUrl: imageTrim || undefined,
        category: x.category ? String(x.category) : undefined,
        isCombo: Boolean(x.isCombo),
        discountPct: x.discountPct != null ? Number(x.discountPct) : undefined,
        limitedSlots: Boolean(x.limitedSlots),
        active: x.active !== false,
      } satisfies PackageDoc;
    });
    rows.sort((a, b) => a.price - b.price);
    setList(rows);
  }, [db]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [db, refresh]);

  useEffect(() => {
    if (!db || loading || list.length > 0 || triedAutoSeed.current) return;
    triedAutoSeed.current = true;
    (async () => {
      const r = await fetch("/api/seed-catalog-if-empty", { method: "POST" });
      if (r.ok) await refresh();
    })();
  }, [db, loading, list.length, refresh]);

  function startEdit(p: PackageDoc) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      price: p.price,
      duration: p.duration,
      includes: p.includes.join(", "),
      rating: p.rating,
      slotsLeft: p.slotsLeft ?? 0,
      bookedToday: p.bookedToday ?? 0,
      imageUrl: p.imageUrl ?? "",
      category: p.category ?? "Goa",
      isCombo: p.isCombo ?? false,
      limitedSlots: p.limitedSlots ?? false,
      discountPct: p.discountPct ?? 0,
      active: p.active !== false,
    });
  }

  function toPayload() {
    return {
      name: form.name.trim(),
      price: Number(form.price),
      duration: form.duration.trim(),
      includes: form.includes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      rating: Number(form.rating),
      slotsLeft: Number(form.slotsLeft),
      bookedToday: Number(form.bookedToday),
      imageUrl: form.imageUrl.trim() || "",
      category: form.category.trim(),
      isCombo: form.isCombo,
      limitedSlots: form.limitedSlots,
      discountPct: form.isCombo ? Number(form.discountPct) : 0,
      active: form.active,
    };
  }

  async function save() {
    if (!db) return;
    const payload = toPayload();
    if (!payload.name) return;
    if (editingId) {
      await updateDoc(doc(db, "packages", editingId), payload);
    } else {
      await addDoc(collection(db, "packages"), payload);
    }
    setForm(empty);
    setEditingId(null);
    await refresh();
  }

  async function remove(id: string) {
    if (!db || !confirm("Delete this package?")) return;
    await deleteDoc(doc(db, "packages", id));
    await refresh();
  }

  async function togglePackageActive(p: PackageDoc) {
    if (!db) return;
    const next = p.active === false;
    await updateDoc(doc(db, "packages", p.id), { active: next });
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
      <h1 className="font-display text-3xl font-bold text-ocean-900">Packages</h1>
      <p className="mt-2 text-sm text-ocean-600">
        Includes scuba, tours, casinos, clubs, flyboarding, bungee. Uncheck{" "}
        <strong>Active</strong> to hide a package from the public site (booking,
        homepage, combos) without deleting it.
      </p>

      <div className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-ocean-900">
          {editingId ? "Edit package" : "Add package"}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Name
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="text-sm">
            Price (INR)
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.price}
              onChange={(e) =>
                setForm((f) => ({ ...f, price: Number(e.target.value) }))
              }
            />
          </label>
          <label className="text-sm sm:col-span-2">
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
            Includes (comma-separated)
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.includes}
              onChange={(e) =>
                setForm((f) => ({ ...f, includes: e.target.value }))
              }
            />
            <span className="mt-1 block text-xs text-ocean-600">
              All items appear as tags on the package card (no limit).
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
          <label className="text-sm">
            Category
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
            />
          </label>
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
          <label className="text-sm sm:col-span-2">
            Image URL
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
              value={form.imageUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, imageUrl: e.target.value }))
              }
              placeholder="https://… (direct image link; any host)"
            />
            <span className="mt-1 block text-xs text-ocean-600">
              Use a full <code className="text-[10px]">https://</code> link to the image
              file. The homepage uses a flexible loader so hosts do not need to be
              listed in Next.js config.
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isCombo}
              onChange={(e) =>
                setForm((f) => ({ ...f, isCombo: e.target.checked }))
              }
            />
            Combo offer
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.limitedSlots}
              onChange={(e) =>
                setForm((f) => ({ ...f, limitedSlots: e.target.checked }))
              }
            />
            Limited slots tag
          </label>
          {form.isCombo ? (
            <label className="text-sm">
              Discount %
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2"
                value={form.discountPct}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discountPct: Number(e.target.value) }))
                }
              />
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm((f) => ({ ...f, active: e.target.checked }))
              }
            />
            Active (visible on site)
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            className="rounded-full bg-ocean-800 px-5 py-2 text-sm font-semibold text-white"
          >
            {editingId ? "Update" : "Add"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(empty);
              }}
              className="rounded-full border border-ocean-200 px-5 py-2 text-sm font-semibold text-ocean-800"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-ocean-100 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-ocean-600">Loading…</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ocean-100 bg-ocean-50 text-ocean-800">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">₹</th>
                <th className="p-3">Slots</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-ocean-50 ${
                    p.active === false ? "bg-ocean-50/80 opacity-90" : ""
                  }`}
                >
                  <td className="p-3 font-medium text-ocean-900">{p.name}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => togglePackageActive(p)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        p.active === false
                          ? "bg-ocean-200 text-ocean-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {p.active === false ? "Inactive" : "Active"}
                    </button>
                  </td>
                  <td className="p-3">{p.price}</td>
                  <td className="p-3">{p.slotsLeft ?? "—"}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="text-ocean-600 hover:underline"
                      onClick={() => startEdit(p)}
                    >
                      Edit
                    </button>
                    <span className="mx-2 text-ocean-300">|</span>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => remove(p.id)}
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
