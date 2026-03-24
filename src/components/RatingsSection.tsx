"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { DEMO_TESTIMONIALS } from "@/data/demo-testimonials";

type Review = {
  id: string;
  authorName: string;
  comment: string;
  rating: number;
};

function GuestReviewAvatar({ name }: { name: string }) {
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ocean-200/80 bg-gradient-to-br from-ocean-100 to-ocean-200"
      role="img"
      aria-label={`${name.trim() || "Guest"} profile`}
    >
      <svg
        className="h-6 w-6 text-ocean-500"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    </div>
  );
}

export function RatingsSection() {
  const db = getDb();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [comment, setComment] = useState("");
  /** 0 = user has not chosen a rating yet (only empty stars shown). */
  const [rating, setRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoadError(null);
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
      } catch (e: unknown) {
        setReviews([]);
        const code =
          e && typeof e === "object" && "code" in e
            ? String((e as { code?: string }).code)
            : "";
        setLoadError(
          code === "failed-precondition"
            ? "Reviews need a Firestore index. Deploy firestore.indexes.json or use the link in the browser console."
            : "Could not load reviews. Check Firestore rules and try again."
        );
      }
      setLoading(false);
    })();
  }, [db]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return null;
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (rating < 1 || rating > 5) {
      setMsg("Tap a star to choose your rating first.");
      return;
    }
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
      setAuthorName("");
      setRating(0);
      setHoverStar(0);
      setMsg("Thanks! Your review will appear after we approve it.");
    } catch {
      setMsg("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const starDisplay = hoverStar || rating;

  return (
    <section className="border-t border-ocean-100 bg-white py-10 sm:py-12">
      <div className="mx-auto max-w-5xl px-4">
        <h2 id="guest-reviews" className="sr-only">
          Guest reviews
        </h2>

        {loadError ? (
          <p className="mt-2 text-center text-sm text-amber-800">{loadError}</p>
        ) : null}

        {db && loading ? (
          <p className="mt-2 text-center text-xs text-ocean-500">
            Loading submitted reviews…
          </p>
        ) : null}

        {db && !loading && reviews.length > 0 && averageRating != null ? (
          <p className="mt-4 text-center text-sm font-medium text-ocean-800">
            Average from {reviews.length} approved review
            {reviews.length === 1 ? "" : "s"}:{" "}
            <span className="text-amber-600">
              ★ {averageRating.toFixed(1)} / 5
            </span>
          </p>
        ) : null}

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {DEMO_TESTIMONIALS.map((d) => (
            <li
              key={d.id}
              className="rounded-2xl border border-ocean-100 bg-sand/50 p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-ocean-100">
                  <Image
                    src={d.img}
                    alt={d.authorName}
                    fill
                    className="object-cover"
                    sizes="44px"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ocean-900">
                        {d.authorName}
                      </p>
                      <p className="text-xs text-ocean-600">
                        Google review · {d.place}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-ocean-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ocean-800">
                      Guest
                    </span>
                  </div>
                  <p className="mt-1 text-amber-600" aria-hidden>
                    {"★".repeat(Math.min(5, Math.max(0, d.rating)))}
                    <span className="sr-only">{d.rating} out of 5</span>
                  </p>
                  <p className="mt-2 text-sm text-ocean-800">{d.comment}</p>
                </div>
              </div>
            </li>
          ))}
          {db
            ? reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border border-ocean-100 bg-sand/50 p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <GuestReviewAvatar name={r.authorName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold text-ocean-900">
                          {r.authorName || "Guest"}
                        </p>
                        <span className="shrink-0 rounded-full bg-ocean-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ocean-800">
                          GUEST
                        </span>
                      </div>
                      <p className="mt-1 text-amber-600" aria-hidden>
                        {"★".repeat(Math.min(5, Math.max(0, r.rating)))}
                        <span className="sr-only">{r.rating} out of 5</span>
                      </p>
                      <p className="mt-2 text-sm text-ocean-800">{r.comment}</p>
                    </div>
                  </div>
                </li>
              ))
            : null}
        </ul>

        <div className="mx-auto mt-10 max-w-lg sm:mt-12">
          <h3 className="font-display text-center text-base font-semibold text-ocean-900 sm:text-lg">
            Rate your experience
          </h3>
          <p className="mt-1 text-center text-xs text-ocean-600 sm:text-sm">
            Tap a star to begin — name and comment appear after you choose a rating.
          </p>
          <div
            className="mt-6 flex justify-center gap-1"
            role="group"
            aria-label="Choose rating from 1 to 5 stars"
            onMouseLeave={() => setHoverStar(0)}
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = starDisplay >= n && starDisplay > 0;
              return (
                <button
                  key={n}
                  type="button"
                  className={`rounded p-0.5 text-3xl leading-none transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 sm:p-1 sm:text-4xl ${
                    filled ? "text-amber-500" : "text-ocean-200"
                  }`}
                  aria-label={`${n} out of 5 stars`}
                  aria-pressed={rating === n}
                  onMouseEnter={() => setHoverStar(n)}
                  onClick={() => setRating(n)}
                >
                  {filled ? "★" : "☆"}
                </button>
              );
            })}
          </div>

          {msg ? (
            <p className="mt-4 text-center text-sm text-ocean-700" role="status">
              {msg}
            </p>
          ) : null}

          {rating > 0 ? (
            <form
              onSubmit={submit}
              className="mt-6 rounded-2xl border border-ocean-100 bg-sand/40 p-6 shadow-sm"
            >
              <p className="text-center text-sm text-ocean-700">
                You chose{" "}
                <span className="font-semibold text-amber-600">
                  {rating} / 5
                </span>
                . Add your name and comment, then submit.
              </p>
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
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-full bg-ocean-800 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Sending…" : "Submit review"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-ocean-200 py-3 text-sm font-semibold text-ocean-800"
                  onClick={() => {
                    setRating(0);
                    setHoverStar(0);
                    setMsg(null);
                  }}
                >
                  Clear rating
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
