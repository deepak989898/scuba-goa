"use client";

import { useMemo } from "react";
import {
  ReviewCarousel,
  type CarouselReview,
} from "@/components/ReviewCarousel";
import {
  demoProfileStats,
  demoRatingForIndex,
  ENGLISH_REVIEW_TEMPLATES,
  HINGLISH_REVIEW_TEMPLATES,
  isHinglishReviewIndex,
} from "@/data/demo-reviews-content";

const REVIEW_DATE_LABELS = [
  "2 days ago",
  "4 days ago",
  "1 week ago",
  "10 days ago",
  "2 weeks ago",
  "3 weeks ago",
  "1 month ago",
  "5 weeks ago",
  "6 weeks ago",
  "2 months ago",
];

type Review = {
  id: string;
  authorName: string;
  comment: string;
  rating: number;
  place: string;
};

export function RatingsSection() {
  function getIstDateKey(d: Date): string {
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

  function formatReviewCount(n: number): string {
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
      const hinglish = isHinglishReviewIndex(pool.length);
      const tplList = hinglish
        ? HINGLISH_REVIEW_TEMPLATES
        : ENGLISH_REVIEW_TEMPLATES;
      const tpl = tplList[pool.length % tplList.length] ?? tplList[0]!;
      const comment = tpl.replace(/\{service\}/g, service);
      pool.push({
        id: `demo-pool-${i}`,
        authorName: fullName.slice(0, 80),
        place,
        comment,
        rating: demoRatingForIndex(pool.length),
      });
      i++;
    }

    const anchorKey = "2026-03-26";
    const baseCount = 4000;
    const dailyBase = 100;
    const seed = hashStringToUint32(todayKey + "|reviews");
    const daysSinceAnchor = Math.max(
      0,
      Math.floor(
        (ymdToUTCDate(todayKey).getTime() - ymdToUTCDate(anchorKey).getTime()) /
          86400000,
      ),
    );
    const jitter = (seed % 41) - 20;
    const reviewCount = baseCount + daysSinceAnchor * dailyBase + jitter;

    const rng = mulberry32(seed);
    const idx = Array.from({ length: 100 }, (_, k) => k);
    for (let j = idx.length - 1; j > 0; j--) {
      const r = Math.floor(rng() * (j + 1));
      [idx[j], idx[r]] = [idx[r], idx[j]];
    }
    const visibleReviews: CarouselReview[] = idx
      .slice(0, 12)
      .map((k, i) => {
        const r = pool[k];
        if (!r?.authorName || !r.comment) return null;
        const profile = demoProfileStats(r.id || r.authorName);
        return {
          id: r.id,
          authorName: r.authorName,
          profileReviewCount: profile.reviewCount,
          profilePhotoCount: profile.photoCount,
          comment: r.comment,
          rating: r.rating,
          dateLabel:
            REVIEW_DATE_LABELS[i % REVIEW_DATE_LABELS.length] ?? "Recently",
        };
      })
      .filter((r): r is CarouselReview => r != null);

    return {
      reviewCount,
      visibleReviews,
    };
  }, [todayKey]);

  const averageRatingFixed = 4.6;
  const reviewCountLabel = formatReviewCount(demoModel.reviewCount);
  const carouselReviews = demoModel.visibleReviews;

  return (
    <section className="border-t border-ocean-100 bg-white py-5 sm:py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="guest-reviews" className="sr-only">
          Guest reviews
        </h2>

        {carouselReviews.length > 0 ? (
          <>
            <p className="text-center text-sm font-medium text-[#3C4043]">
              Average from {reviewCountLabel} review
              {reviewCountLabel === "1+" ? "" : "s"}:{" "}
              <span className="inline-flex items-center gap-0.5 font-semibold text-[#202124]">
                <span className="text-[#FABB05]" aria-hidden>
                  ★
                </span>
                {averageRatingFixed.toFixed(1)} / 5
              </span>
            </p>
            <div className="mt-5 -mx-4 sm:-mx-6 lg:-mx-8">
              <ReviewCarousel reviews={carouselReviews} />
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
