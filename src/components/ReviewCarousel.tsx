"use client";

import { GoogleStyleReviewCard } from "@/components/GoogleStyleReviewCard";

export type CarouselReview = {
  id: string;
  authorName: string;
  profileReviewCount: number;
  profilePhotoCount: number;
  comment: string;
  rating: number;
  dateLabel: string;
};

type Props = {
  reviews: CarouselReview[];
};

/** Full-width continuous marquee: cards move right → left. */
export function ReviewCarousel({ reviews }: Props) {
  if (reviews.length === 0) return null;

  const track = [...reviews, ...reviews];

  return (
    <div
      className="relative w-full overflow-hidden"
      aria-label="Guest reviews scrolling"
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent sm:w-12"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent sm:w-12"
        aria-hidden
      />

      <div className="flex w-max animate-review-marquee gap-4 py-1 hover:[animation-play-state:paused] motion-reduce:animate-none">
        {track.map((r, i) => (
          <div
            key={`${r.id}-${i}`}
            className="w-[min(20rem,82vw)] shrink-0 sm:w-[22rem]"
            aria-hidden={i >= reviews.length}
          >
            <GoogleStyleReviewCard
              authorName={r.authorName}
              profileReviewCount={r.profileReviewCount}
              profilePhotoCount={r.profilePhotoCount}
              comment={r.comment}
              rating={r.rating}
              dateLabel={r.dateLabel}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
