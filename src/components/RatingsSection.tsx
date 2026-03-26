"use client";

import { useMemo, useState } from "react";

type Review = {
  id: string;
  authorName: string;
  comment: string;
  rating: number;
  place: string;
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
  const [authorName, setAuthorName] = useState("");
  const [comment, setComment] = useState("");
  /** 0 = user has not chosen a rating yet (only empty stars shown). */
  const [rating, setRating] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function getIstDateKey(d: Date): string {
    // en-CA gives YYYY-MM-DD
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  }

  function ymdToUTCDate(ymd: string): Date {
    const [y, m, day] = ymd.split("-").map((x) => Number(x));
    return new Date(Date.UTC(y, m - 1, day));
  }

  function hashStringToUint32(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed: number) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function formatApprovedCount(n: number): string {
    if (n >= 1000) {
      return `${(n / 1000).toFixed(1)}k+`.replace(".0k+", "k+");
    }
    return `${n}+`;
  }

  const todayKey = getIstDateKey(new Date());

  const demoModel = useMemo(() => {
    const firstNames = [
      "Priya",
      "Rahul",
      "Ananya",
      "Sanjay",
      "Neha",
      "Vijay",
      "Kavya",
      "Rohit",
      "Aarav",
      "Ishita",
      "Meera",
      "Ritesh",
      "Siddharth",
      "Divya",
      "Arjun",
      "Karthik",
      "Sneha",
      "Harsh",
      "Nikita",
      "Ankit",
      "Neel",
      "Riya",
      "Tara",
      "Aditi",
      "Kunal",
      "Shreya",
      "Pranav",
      "Sahil",
      "Komal",
      "Mohit",
      "Pooja",
      "Chirag",
      "Garima",
      "Manish",
      "Nandini",
      "Raghav",
      "Tanya",
      "Vikram",
      "Devansh",
      "Kriti",
      "Anjali",
      "Aditya",
      "Lakshmi",
      "Farhan",
      "Imran",
      "Zoya",
      "Noor",
      "Faisal",
      "Ayesha",
      "Aman",
      "Arvind",
      "Chandan",
      "Devika",
      "Kishan",
      "Pratik",
      "Rohini",
      "Yash",
      "Mehul",
      "Rashmi",
      "Deepak",
      "Pallavi",
      "Harpreet",
      "Gurpreet",
      "Monika",
      "Varun",
      "Rohan",
      "Tarun",
      "Sonal",
    ];
    const lastNames = [
      "Sharma",
      "Patel",
      "Verma",
      "Singh",
      "Gupta",
      "Yadav",
      "Khan",
      "Rao",
      "Nair",
      "Iyer",
      "Das",
      "Bose",
      "Ghosh",
      "Kulkarni",
      "Mehta",
      "Jain",
      "Kapoor",
      "Malhotra",
      "Sen",
      "Roy",
      "Bhattacharya",
      "Saxena",
      "Reddy",
      "Ahmed",
      "Kumar",
      "Wadhwa",
      "Bhat",
      "Choudhury",
    ];
    const places = [
      "Bangalore",
      "Mumbai",
      "Delhi",
      "Pune",
      "Hyderabad",
      "Ahmedabad",
      "Chennai",
      "Jaipur",
      "Lucknow",
      "Kolkata",
      "Gurgaon",
      "Noida",
      "Coimbatore",
      "Nagpur",
      "Indore",
    ];
    const services = [
      "scuba diving",
      "water sports",
      "north Goa tour",
      "south Goa tour",
      "dudhsagar trip",
      "dolphin cruise",
      "jet ski experience",
      "sunrise activity",
      "nightlife add-on",
    ];
    const templates = [
      "The safety briefing was clear and the crew handled everything professionally. Our {service} slot felt smooth and fun.",
      "Pickup was on time, and the whole experience was well-organized. Loved the {service}—great views and great energy.",
      "Clean gear, friendly staff, and transparent pricing. {service} was worth every minute of our day.",
      "We were a little nervous at first, but the guide explained everything step-by-step. Fantastic {service}!",
      "Amazing experience with a calm, confident team. The {service} itinerary was perfect and well-paced.",
      "Great communication on WhatsApp. The {service} team managed time perfectly and helped us enjoy without stress.",
      "Super organized from start to finish. {service} delivered exactly what was promised—highly recommended.",
      "The operator was professional and the crew made sure everyone felt comfortable. Best {service} we booked in Goa.",
      "Everything felt premium—timing, guidance, and the overall {service} experience.",
      "Smooth boat ride, helpful guide, and excellent atmosphere. We’d do the {service} again anytime.",
      "The team was friendly and patient. Our {service} experience was memorable and totally stress-free.",
      "Great photos, great vibe, and great service. Loved the {service} and the attention to detail.",
    ];

    // Generate a pool of exactly 100 demo reviews.
    const pool: Review[] = [];
    const usedNames = new Set<string>();
    let i = 0;
    while (pool.length < 100 && i < 1000) {
      const first = firstNames[i % firstNames.length] ?? "Guest";
      const last = lastNames[(i * 7) % lastNames.length] ?? "Kumar";
      const fullName = `${first} ${last}`;
      if (usedNames.has(fullName)) {
        i++;
        continue;
      }
      usedNames.add(fullName);
      const place = places[(i * 3) % places.length] ?? "India";
      const service = services[(i * 5) % services.length] ?? "experience";
      const tpl = templates[i % templates.length] ?? templates[0]!;
      const comment = tpl.replace("{service}", service);
      pool.push({
        id: `demo-pool-${i}`,
        authorName: fullName.slice(0, 80),
        place,
        comment,
        rating: 4,
      });
      i++;
    }

    // Daily increasing "approved reviews" count with small jitter.
    const anchorKey = "2026-03-26";
    const baseCount = 4000; // starts around 4k+
    const dailyBase = 100;
    const seed = hashStringToUint32(todayKey + "|reviews");
    const daysSinceAnchor = Math.max(
      0,
      Math.floor((ymdToUTCDate(todayKey).getTime() - ymdToUTCDate(anchorKey).getTime()) / 86400000)
    );
    const jitter = (seed % 41) - 20; // -20..+20
    const approvedCount = baseCount + daysSinceAnchor * dailyBase + jitter;

    const rng = mulberry32(seed);
    const idx = Array.from({ length: 100 }, (_, k) => k);
    // Fisher–Yates shuffle with seeded RNG
    for (let j = idx.length - 1; j > 0; j--) {
      const r = Math.floor(rng() * (j + 1));
      [idx[j], idx[r]] = [idx[r], idx[j]];
    }
    const visibleReviews = idx.slice(0, 5).map((k) => pool[k]!).filter(Boolean);

    return {
      todayKey,
      approvedCount,
      visibleReviews,
    };
  }, [todayKey]);

  const averageRatingFixed = 4.6;
  const approvedReviewLabel = formatApprovedCount(demoModel.approvedCount);

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

        {demoModel.visibleReviews.length > 0 ? (
          <p className="mt-4 text-center text-sm font-medium text-ocean-800">
            Average from {approvedReviewLabel} approved review
            {approvedReviewLabel === "1+" ? "" : "s"}:{" "}
            <span className="text-amber-600">
              ★ {averageRatingFixed.toFixed(1)} / 5
            </span>
          </p>
        ) : null}

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {demoModel.visibleReviews.map((d) => (
            <li
              key={d.id}
              className="rounded-2xl border border-ocean-100 bg-sand/50 p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <GuestReviewAvatar name={d.authorName} />
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
