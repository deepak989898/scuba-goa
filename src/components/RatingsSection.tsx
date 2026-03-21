"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { SITE_NAME } from "@/lib/constants";

type Review = {
  id: string;
  authorName: string;
  comment: string;
  rating: number;
};

export function RatingsSection() {
  const db = getDb();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const q = query(
          collection(db, "ratings"),
          where("approved", "==", true),
          orderBy("createdAt", "desc"),
          limit(12)
        );
        const snap = await getDocs(q);
        setReviews(
          snap.docs.map((d) => {
            const x = d.data();
            return {
              id: d.id,
              authorName: String(x.authorName ?? ""),
              comment: String(x.comment ?? ""),
              rating: Number(x.rating ?? 5),
            };
          })
        );
      } catch {
        setReviews([]);
      }
      setLoading(false);
    })();
  }, [db]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: authorName.trim() || "Guest",
          comment: comment.trim(),
          rating,
          website: "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? "Could not submit");
        return;
      }
      setComment("");
      setMsg("Thanks! Your review will appear after we approve it.");
    } catch {
      setMsg("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!db) {
    return (
      <section className="border-t border-ocean-100 bg-white py-16">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-ocean-600">
          Guest reviews require Firebase to be configured.
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-ocean-100 bg-white py-16">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="font-display text-center text-3xl font-bold text-ocean-900">
          Guest reviews
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-ocean-600">
          Share your experience with {SITE_NAME}. Reviews are moderated before
          they appear here.
        </p>

        {loading ? (
          <p className="mt-10 text-center text-ocean-600">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="mt-10 text-center text-sm text-ocean-600">
            Be the first to leave a review.
          </p>
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-ocean-100 bg-sand/50 p-5 shadow-sm"
              >
                <p className="font-semibold text-ocean-900">{r.authorName}</p>
                <p className="text-amber-600" aria-hidden>
                  {"★".repeat(Math.min(5, Math.max(0, r.rating)))}
                  <span className="sr-only">{r.rating} out of 5</span>
                </p>
                <p className="mt-2 text-sm text-ocean-800">{r.comment}</p>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={submit}
          className="mx-auto mt-12 max-w-lg rounded-2xl border border-ocean-100 bg-sand/40 p-6 shadow-sm"
        >
          <h3 className="font-display text-lg font-semibold text-ocean-900">
            Rate your experience
          </h3>
          <label className="mt-4 block text-sm font-medium text-ocean-800">
            Your name
            <input
              className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Optional"
              maxLength={80}
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-ocean-800">
            Rating
            <select
              className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} — {n === 5 ? "Excellent" : n === 4 ? "Good" : "OK"}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-sm font-medium text-ocean-800">
            Comment
            <textarea
              required
              rows={3}
              className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={800}
              placeholder="Tell others about your dive or tour…"
            />
          </label>
          {msg ? (
            <p className="mt-3 text-sm text-ocean-700" role="status">
              {msg}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-full bg-ocean-800 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Sending…" : "Submit review"}
          </button>
        </form>
      </div>
    </section>
  );
}
