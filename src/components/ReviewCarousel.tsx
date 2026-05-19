"use client";

import { useCallback, useEffect, useState } from "react";
import { GoogleStyleReviewCard } from "@/components/GoogleStyleReviewCard";

export type CarouselReview = {
  id: string;
  authorName: string;
  place: string;
  comment: string;
  rating: number;
  dateLabel: string;
};

const AUTO_MS = 5500;
const FADE_MS = 450;

type Props = {
  reviews: CarouselReview[];
};

export function ReviewCarousel({ reviews }: Props) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const count = reviews.length;

  const goTo = useCallback(
    (next: number) => {
      if (count <= 1) return;
      const normalized = ((next % count) + count) % count;
      if (normalized === index) return;
      setVisible(false);
      window.setTimeout(() => {
        setIndex(normalized);
        setVisible(true);
      }, FADE_MS);
    },
    [count, index]
  );

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(goNext, AUTO_MS);
    return () => window.clearInterval(id);
  }, [count, goNext]);

  if (count === 0) return null;

  const current = reviews[index]!;

  return (
    <div className="mx-auto max-w-xl">
      <div
        className="relative min-h-[11rem] overflow-hidden"
        aria-live="polite"
        aria-atomic="true"
      >
        <div
          className={`transition-all ease-in-out ${
            visible
              ? "translate-x-0 opacity-100 duration-500"
              : "-translate-x-6 opacity-0 duration-[450ms]"
          }`}
        >
          <GoogleStyleReviewCard
            authorName={current.authorName}
            place={current.place}
            comment={current.comment}
            rating={current.rating}
            dateLabel={current.dateLabel}
          />
        </div>
      </div>

      {count > 1 ? (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={goPrev}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DADCE0] bg-white text-lg text-[#5F6368] shadow-sm transition hover:bg-[#F8F9FA] focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
            aria-label="Previous review"
          >
            ‹
          </button>
          <div className="flex gap-1.5" role="tablist" aria-label="Review slides">
            {reviews.map((r, i) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Review ${i + 1} of ${count}`}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index
                    ? "w-6 bg-[#1A73E8]"
                    : "w-2 bg-[#DADCE0] hover:bg-[#BDC1C6]"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={goNext}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DADCE0] bg-white text-lg text-[#5F6368] shadow-sm transition hover:bg-[#F8F9FA] focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
            aria-label="Next review"
          >
            ›
          </button>
        </div>
      ) : null}

      <p className="mt-3 text-center text-[11px] text-[#5F6368]">
        Guest reviews shared on Book Scuba Goa — styled for readability, not
        imported from Google.
      </p>
    </div>
  );
}
