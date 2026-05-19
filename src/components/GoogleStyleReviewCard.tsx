"use client";

type Props = {
  authorName: string;
  place: string;
  comment: string;
  rating: number;
  dateLabel?: string;
};

const STAR_FILL = "#FABB05";
const STAR_EMPTY = "#DADCE0";

function avatarHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
}

function StarRow({ rating }: { rating: number }) {
  const full = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} className="h-4 w-4" viewBox="0 0 24 24" fill={i < full ? STAR_FILL : STAR_EMPTY}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="sr-only">{rating} out of 5 stars</span>
    </div>
  );
}

export function GoogleStyleReviewCard({ authorName, place, comment, rating, dateLabel = "Recently" }: Props) {
  const safeName = String(authorName ?? "").trim() || "Guest";
  const safePlace = String(place ?? "").trim() || "India";
  const safeComment = String(comment ?? "").trim() || "Great experience.";
  const safeRating = typeof rating === "number" && Number.isFinite(rating) ? rating : 5;
  const initial = (safeName[0] ?? "G").toUpperCase();
  const hue = avatarHue(safeName);

  return (
    <article className="rounded-xl border border-[#DADCE0] bg-white px-5 py-4 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white" style={{ backgroundColor: `hsl(${hue} 45% 42%)` }} aria-hidden>
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#202124]">{safeName}</p>
          <p className="text-xs text-[#5F6368]">Guest review · {safePlace}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StarRow rating={safeRating} />
            <span className="text-xs text-[#5F6368]">{dateLabel}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#3C4043]">{safeComment}</p>
        </div>
      </div>
    </article>
  );
}
