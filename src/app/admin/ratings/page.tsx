"use client";

import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

type Row = {
  id: string;
  authorName: string;
  comment: string;
  rating: number;
  approved: boolean;
  createdAt: unknown;
};

function formatTs(v: unknown): string {
  if (
    v &&
    typeof v === "object" &&
    "toDate" in v &&
    typeof (v as Timestamp).toDate === "function"
  ) {
    return (v as Timestamp).toDate().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
  }
  return String(v ?? "—");
}

export default function AdminRatingsPage() {
  const db = getDb();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const q = query(
          collection(db, "ratings"),
          orderBy("createdAt", "desc"),
          limit(200)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const list = snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            authorName: String(x.authorName ?? ""),
            comment: String(x.comment ?? ""),
            rating: Number(x.rating ?? 0),
            approved: Boolean(x.approved),
            createdAt: x.createdAt,
          };
        });
        setRows(list);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg =
          e && typeof e === "object" && "code" in e
            ? `${String((e as { code?: string }).code)}: ${String((e as { message?: string }).message ?? e)}`
            : String(e);
        setLoadError(msg);
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  async function toggleApproved(r: Row) {
    if (!db) return;
    await updateDoc(doc(db, "ratings", r.id), { approved: !r.approved });
    setRows((prev) =>
      prev.map((x) =>
        x.id === r.id ? { ...x, approved: !x.approved } : x
      )
    );
  }

  async function remove(id: string) {
    if (!db) return;
    if (!confirm("Delete this review permanently?")) return;
    await deleteDoc(doc(db, "ratings", id));
    setRows((prev) => prev.filter((x) => x.id !== id));
  }

  if (!db) {
    return (
      <p className="text-ocean-700">Firebase client not configured.</p>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ocean-900">
        Reviews & ratings
      </h1>
      <p className="mt-2 text-sm text-ocean-600">
        New submissions are hidden until you approve them. Only approved reviews
        appear on the homepage.
      </p>

      {loadError ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Could not load reviews</p>
          <p className="mt-2 font-mono text-xs opacity-90">{loadError}</p>
          <p className="mt-3 text-ocean-800">
            Deploy <code className="text-xs">firestore.rules</code> (must allow admins
            to read <code className="text-xs">ratings</code>). If the error mentions an
            index, deploy <code className="text-xs">firestore.indexes.json</code>.
          </p>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-8 text-ocean-600">Loading…</p>
      ) : loadError ? null : rows.length === 0 ? (
        <p className="mt-8 text-ocean-600">No reviews yet.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-ocean-100 bg-white p-4 text-sm shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ocean-900">
                    {r.authorName}{" "}
                    <span className="text-amber-600">
                      {"★".repeat(Math.min(5, Math.max(0, r.rating)))}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-ocean-500">{formatTs(r.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      r.approved
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                    onClick={() => toggleApproved(r)}
                  >
                    {r.approved ? "Approved" : "Pending — click to approve"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    onClick={() => remove(r.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-3 text-ocean-800">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
