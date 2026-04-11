"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { normalizePromoCode } from "@/lib/promo-pricing";
import type { OfferDoc } from "@/lib/types";

type SeedOffer = Omit<OfferDoc, "id">;

const SEED_OFFERS: SeedOffer[] = [
  {
    title: "Couple — 10% off",
    description:
      "For exactly 2 people / units in your cart. Enter on the booking page before online payment.",
    promoCode: "COUPLE10",
    discountPercent: 10,
    minCartUnits: 2,
    maxCartUnits: 2,
    category: "Couple",
    sortOrder: 10,
    active: true,
  },
  {
    title: "Group 4–6 — 10% off",
    description: "Cart size 4 to 6 people / units. Online checkout only.",
    promoCode: "GROUP410",
    discountPercent: 10,
    minCartUnits: 4,
    maxCartUnits: 6,
    category: "Group",
    sortOrder: 20,
    active: true,
  },
  {
    title: "Group 7–9 — 20% off",
    description: "Cart size 7 to 9 people / units. Online checkout only.",
    promoCode: "GROUP720",
    discountPercent: 20,
    minCartUnits: 7,
    maxCartUnits: 9,
    category: "Group",
    sortOrder: 30,
    active: true,
  },
  {
    title: "Group 10+ — 30% off",
    description: "Ten or more people / units in cart. Online checkout only.",
    promoCode: "GROUP10PLUS",
    discountPercent: 30,
    minCartUnits: 10,
    maxCartUnits: null,
    category: "Group",
    sortOrder: 40,
    active: true,
  },
  {
    title: "Birthday — 20% off",
    description:
      "Celebrate with 20% off your online cart. Valid ID may be checked on the day.",
    promoCode: "BDAY20",
    discountPercent: 20,
    minCartUnits: 1,
    maxCartUnits: null,
    category: "Birthday",
    sortOrder: 50,
    active: true,
  },
];

function mapRow(id: string, x: Record<string, unknown>): OfferDoc {
  return {
    id,
    title: String(x.title ?? ""),
    description: String(x.description ?? ""),
    promoCode: normalizePromoCode(String(x.promoCode ?? "")),
    discountPercent: Number(x.discountPercent ?? 0),
    minCartUnits:
      x.minCartUnits !== undefined ? Math.max(1, Math.floor(Number(x.minCartUnits))) : 1,
    maxCartUnits:
      x.maxCartUnits !== undefined && x.maxCartUnits !== null && String(x.maxCartUnits) !== ""
        ? Math.floor(Number(x.maxCartUnits))
        : null,
    category: x.category ? String(x.category) : undefined,
    sortOrder: x.sortOrder !== undefined ? Number(x.sortOrder) : 0,
    active: x.active !== false,
  };
}

export default function AdminOffersPage() {
  const db = getDb();
  const [list, setList] = useState<OfferDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const triedSeed = useRef(false);

  const emptyForm = {
    title: "",
    description: "",
    promoCode: "",
    discountPercent: 10,
    minCartUnits: 1,
    maxCartUnits: "" as string | number,
    category: "General",
    sortOrder: 100,
    active: true,
  };
  const [form, setForm] = useState(emptyForm);

  const refresh = useCallback(async () => {
    if (!db) return;
    const snap = await getDocs(collection(db, "offers"));
    const rows = snap.docs.map((d) => mapRow(d.id, d.data() as Record<string, unknown>));
    rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    setList(rows);
  }, [db]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [db, refresh]);

  const seedDefaults = useCallback(async () => {
    if (!db) return;
    setMsg(null);
    setSaving(true);
    try {
      const existing = await getDocs(collection(db, "offers"));
      const codes = new Set(
        existing.docs.map((d) =>
          normalizePromoCode(String((d.data() as { promoCode?: string }).promoCode ?? ""))
        )
      );
      for (const row of SEED_OFFERS) {
        const code = normalizePromoCode(row.promoCode);
        if (!code || codes.has(code)) continue;
        await addDoc(collection(db, "offers"), {
          ...row,
          promoCode: code,
          onlineOnly: true,
        });
        codes.add(code);
      }
      await refresh();
      setMsg("Sample offers added (skipped codes that already exist).");
    } catch {
      setMsg("Could not seed offers.");
    } finally {
      setSaving(false);
    }
  }, [db, refresh]);

  useEffect(() => {
    if (!db || loading || list.length > 0 || triedSeed.current) return;
    triedSeed.current = true;
    void seedDefaults();
  }, [db, loading, list.length, seedDefaults]);

  function startEdit(o: OfferDoc) {
    setEditingId(o.id);
    setForm({
      title: o.title,
      description: o.description,
      promoCode: o.promoCode,
      discountPercent: o.discountPercent,
      minCartUnits: o.minCartUnits ?? 1,
      maxCartUnits: o.maxCartUnits != null ? o.maxCartUnits : "",
      category: o.category ?? "General",
      sortOrder: o.sortOrder ?? 0,
      active: o.active !== false,
    });
  }

  function startNew() {
    setEditingId("new");
    setForm({ ...emptyForm, sortOrder: (list[list.length - 1]?.sortOrder ?? 0) + 10 });
  }

  async function save() {
    if (!db) return;
    setMsg(null);
    const code = normalizePromoCode(form.promoCode);
    if (!form.title.trim() || !form.description.trim() || !code) {
      setMsg("Title, description, and promo code are required.");
      return;
    }
    const pct = Math.floor(Number(form.discountPercent));
    if (!Number.isFinite(pct) || pct < 1 || pct > 50) {
      setMsg("Discount must be between 1% and 50%.");
      return;
    }
    const minU = Math.max(1, Math.floor(Number(form.minCartUnits)));
    const maxRaw = form.maxCartUnits;
    const maxU =
      maxRaw === "" || maxRaw === undefined || maxRaw === null
        ? null
        : Math.floor(Number(maxRaw));

    setSaving(true);
    try {
      const dupQ = query(collection(db, "offers"), where("promoCode", "==", code));
      const dup = await getDocs(dupQ);
      const conflict =
        editingId === "new"
          ? !dup.empty
          : dup.docs.some((d) => d.id !== editingId);
      if (conflict) {
        setMsg("Another offer already uses this promo code.");
        setSaving(false);
        return;
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        promoCode: code,
        discountPercent: pct,
        minCartUnits: minU,
        maxCartUnits: maxU,
        category: form.category.trim() || "General",
        sortOrder: Math.floor(Number(form.sortOrder)) || 0,
        active: form.active,
        onlineOnly: true,
      };

      if (editingId === "new") {
        await addDoc(collection(db, "offers"), payload);
        setMsg("Offer created.");
      } else if (editingId) {
        await updateDoc(doc(db, "offers", editingId), payload);
        setMsg("Offer updated.");
      }
      setEditingId(null);
      setForm(emptyForm);
      await refresh();
    } catch {
      setMsg("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!db || !confirm("Delete this offer?")) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "offers", id));
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm);
      }
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!db) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-ocean-800">
        Firebase is not configured in this build.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-ocean-900">Offers &amp; promos</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void seedDefaults()}
            className="rounded-lg border border-ocean-200 bg-white px-3 py-2 text-sm font-semibold text-ocean-800"
          >
            Re-run sample seed
          </button>
          <button
            type="button"
            onClick={startNew}
            className="rounded-lg bg-ocean-gradient px-4 py-2 text-sm font-bold text-white"
          >
            New offer
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm text-ocean-700">
        Codes are checked on the server at Razorpay checkout. Users see the public list at{" "}
        <a className="font-semibold text-cyan-700 underline" href="/offers">
          /offers
        </a>
        .
      </p>
      {msg ? <p className="mt-3 text-sm text-amber-800">{msg}</p> : null}

      {editingId ? (
        <div className="mt-8 rounded-2xl border border-ocean-100 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ocean-900">
            {editingId === "new" ? "New offer" : "Edit offer"}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-ocean-800">Title</span>
              <input
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-ocean-800">Description (shown on /offers)</span>
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-lg border border-ocean-200 px-3 py-2"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ocean-800">Promo code (unique)</span>
              <input
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2 font-mono uppercase"
                value={form.promoCode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, promoCode: e.target.value.toUpperCase() }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ocean-800">Discount % (1–50)</span>
              <input
                type="number"
                min={1}
                max={50}
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                value={form.discountPercent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discountPercent: Number(e.target.value) }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ocean-800">Min cart units</span>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                value={form.minCartUnits}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minCartUnits: Number(e.target.value) }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ocean-800">Max cart units (empty = no max)</span>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                value={form.maxCartUnits === "" ? "" : form.maxCartUnits}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    maxCartUnits: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ocean-800">Category</span>
              <input
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ocean-800">Sort order</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
                }
              />
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Active (visible on site)
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
                setMsg(null);
              }}
              className="rounded-lg border border-ocean-200 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-8 text-ocean-600">Loading…</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {list.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ocean-100 bg-white px-4 py-3"
            >
              <div>
                <p className="font-semibold text-ocean-900">{o.title}</p>
                <p className="text-xs text-ocean-600">
                  <span className="font-mono font-bold text-cyan-800">{o.promoCode}</span> ·{" "}
                  {o.discountPercent}% · units {o.minCartUnits ?? 1}
                  {o.maxCartUnits != null ? `–${o.maxCartUnits}` : "+"}
                  {o.active === false ? " · inactive" : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(o)}
                  className="text-sm font-semibold text-cyan-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void remove(o.id)}
                  className="text-sm font-semibold text-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
