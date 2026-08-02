import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { RefundFaqAccordion } from "@/components/RefundFaqAccordion";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_HREF,
  CONTACT_PHONE_LABEL,
  SITE_NAME,
  SITE_URL,
  whatsappLink,
} from "@/lib/constants";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: `Refund and cancellation policy for ${SITE_NAME}.`,
  alternates: {
    canonical: `${SITE_URL.replace(/\/$/, "")}/refund-cancellation`,
  },
};

const UPDATED = "26 Mar 2026";

const TRUST_BADGES = [
  "Secure Booking",
  "Transparent Policy",
  "Fast Refund Support",
  "Customer Assistance",
] as const;

const SUMMARY_CARDS = [
  {
    title: "24+ Hours",
    description: "Eligible for Refund or Reschedule",
    tone: "green" as const,
    icon: "clock",
  },
  {
    title: "Within 24 Hours",
    description: "Rescheduling depends on availability",
    tone: "yellow" as const,
    icon: "alert",
  },
  {
    title: "No Show",
    description: "Usually Non Refundable",
    tone: "red" as const,
    icon: "x",
  },
  {
    title: "Weather Cancellation",
    description: "Refund or Reschedule",
    tone: "blue" as const,
    icon: "cloud",
  },
];

const TIMELINE_STEPS = [
  "Booking Cancelled",
  "Verification",
  "Refund Approved",
  "Payment Gateway",
  "Money Returned",
] as const;

const FAQ_ITEMS = [
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes, you can request a cancellation. More than 24 hours before: reschedule subject to availability, or refund (excluding payment gateway charges, if any). Within 24 hours: refund is not guaranteed because slots and logistics are reserved; rescheduling may be offered at our discretion depending on operator policies.",
  },
  {
    question: "When will I receive my refund?",
    answer:
      "Approved refunds are processed to the original payment method. Typical timelines are 5–10 business days, depending on your bank or payment provider.",
  },
  {
    question: "What happens if weather is bad?",
    answer:
      "If an activity is cancelled due to safety/weather/operational reasons, we will offer rescheduling or a refund for the affected portion, as applicable.",
  },
  {
    question: "Can I reschedule?",
    answer:
      "More than 24 hours before: reschedule subject to availability. Within 24 hours: rescheduling may be offered at our discretion depending on operator policies. Weather/operator cancellations also include a rescheduling option where applicable.",
  },
  {
    question: "Is payment gateway charge refundable?",
    answer:
      "Any convenience or gateway charges (if applicable) may be non-refundable.",
  },
];

function SummaryIcon({ name }: { name: (typeof SUMMARY_CARDS)[number]["icon"] }) {
  if (name === "clock") {
    return (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 7v5l3.5 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === "alert") {
    return (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 4l9 16H3L12 4z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M12 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="17" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (name === "x") {
    return (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M9 9l6 6M15 9l-6 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 14a6 6 0 1110.9-3.5A4.5 4.5 0 1117 19H7.5A4.5 4.5 0 016 14z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SectionIcon({
  variant,
}: {
  variant: "book" | "cancel" | "weather" | "time" | "support" | "notes";
}) {
  const common = "h-7 w-7";
  if (variant === "book") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 5.5A2.5 2.5 0 017.5 3H19v15.5H7.5A2.5 2.5 0 005 16V5.5z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path d="M5 16a2.5 2.5 0 012.5 2.5H19" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (variant === "cancel") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8 3.5v3M16 3.5v3M4 10h16" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9.5 14.5l5-5M14.5 14.5l-5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (variant === "weather") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 15a5 5 0 119.2-3.2A3.8 3.8 0 1116 19H8.2A3.7 3.7 0 017 15z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    );
  }
  if (variant === "time") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 7.5V12l3 1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (variant === "support") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 11a7 7 0 0114 0v2a3 3 0 01-3 3h-1v-5h4M5 13h4v5H8a3 3 0 01-3-3v-2z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 10v6M12 7.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const summaryToneClass: Record<(typeof SUMMARY_CARDS)[number]["tone"], string> = {
  green:
    "border-emerald-200 from-emerald-50 to-white text-emerald-800 shadow-emerald-900/5 hover:border-emerald-300",
  yellow:
    "border-amber-200 from-amber-50 to-white text-amber-800 shadow-amber-900/5 hover:border-amber-300",
  red: "border-rose-200 from-rose-50 to-white text-rose-800 shadow-rose-900/5 hover:border-rose-300",
  blue: "border-sky-200 from-sky-50 to-white text-sky-800 shadow-sky-900/5 hover:border-sky-300",
};

export default function RefundCancellationPage() {
  const waHref = whatsappLink(
    "Hi, I need help with a cancellation or refund for my booking.",
  );

  return (
    <div className="bg-gradient-to-b from-sky-50 via-white to-cyan-50/40">
      {/* Compact hero — image stays visible; card stays small */}
      <section className="relative isolate h-[9.5rem] overflow-hidden sm:h-[11rem] lg:h-[12rem]">
        <Image
          src="/offer-header.webp"
          alt=""
          fill
          priority
          quality={70}
          sizes="100vw"
          className="object-cover object-[center_30%]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-ocean-950/35 via-sky-900/25 to-ocean-950/45"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <span className="absolute left-[10%] top-[30%] h-2 w-2 rounded-full bg-white/25" />
          <span className="absolute right-[16%] top-[40%] h-2.5 w-2.5 rounded-full bg-white/15" />
        </div>

        <div className="relative flex h-full items-center justify-center px-3 sm:px-6">
          <div className="w-full max-w-xl rounded-2xl border border-white/30 bg-white/15 px-3 py-2.5 text-center shadow-lg backdrop-blur-sm sm:px-5 sm:py-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/90 sm:text-[10px]">
              Last Updated · {UPDATED}
            </p>
            <h1 className="mt-0.5 font-display text-lg font-black leading-tight tracking-tight text-white sm:text-2xl lg:text-[1.75rem]">
              Refund &amp; Cancellation Policy
            </h1>
            <p className="mx-auto mt-0.5 max-w-md text-[11px] leading-snug text-sky-50/95 sm:text-xs">
              Your booking is protected with transparent cancellation and refund
              policies.
            </p>
            <ul className="mt-1.5 flex flex-wrap items-center justify-center gap-1 sm:gap-1.5">
              {TRUST_BADGES.map((label) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white sm:text-[10px]"
                >
                  <span className="text-emerald-300" aria-hidden>
                    ✓
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Quick summary cards */}
      <section
        className="relative z-10 mx-auto max-w-6xl px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8"
        aria-label="Policy summary"
      >
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-2.5">
          {SUMMARY_CARDS.map((card) => (
            <li
              key={card.title}
              className={`rounded-xl border bg-gradient-to-b p-2.5 shadow-md transition duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:p-3 ${summaryToneClass[card.tone]}`}
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 shadow-sm [&_svg]:h-5 [&_svg]:w-5">
                <SummaryIcon name={card.icon} />
              </span>
              <h2 className="mt-1.5 font-display text-sm font-black tracking-tight sm:text-base">
                {card.title}
              </h2>
              <p className="mt-0.5 text-[10px] font-medium leading-snug opacity-90 sm:text-xs">
                {card.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Intro + policy cards */}
      <div className="mx-auto max-w-4xl px-3 py-5 sm:px-6 sm:py-7 lg:px-8">
        <p className="text-center text-sm leading-relaxed text-ocean-800 sm:text-base">
          This policy explains cancellations, rescheduling, and refunds for bookings
          made on <strong className="text-ocean-950">{SITE_NAME}</strong>.
        </p>

        <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
          <PolicyCard
            title="Before you book"
            icon="book"
          >
            <ul className="list-disc space-y-3 pl-5">
              <li>
                Some activities depend on sea conditions, operator availability, and
                safety guidelines.
              </li>
              <li>
                Prices may include a minimum advance to confirm your slot. The remaining
                amount (if any) may be payable at the venue/operator as communicated.
              </li>
            </ul>
          </PolicyCard>

          <PolicyCard title="Customer cancellation" icon="cancel">
            <ul className="list-disc space-y-3 pl-5">
              <li>
                <strong>More than 24 hours before</strong>: reschedule subject to
                availability, or refund (excluding payment gateway charges, if any).
              </li>
              <li>
                <strong>Within 24 hours</strong>: refund is not guaranteed because slots
                and logistics are reserved; rescheduling may be offered at our discretion
                depending on operator policies.
              </li>
              <li>
                <strong>No-show / late arrival</strong>: typically non-refundable.
              </li>
            </ul>
          </PolicyCard>

          <PolicyCard title="Operator/weather cancellation" icon="weather">
            <ul className="list-disc space-y-3 pl-5">
              <li>
                If an activity is cancelled due to safety/weather/operational reasons,
                we will offer <strong>rescheduling</strong> or a <strong>refund</strong>{" "}
                for the affected portion, as applicable.
              </li>
            </ul>
          </PolicyCard>

          <PolicyCard title="Refund timeline" icon="time">
            <p>
              Approved refunds are processed to the original payment method. Typical
              timelines are <strong>5–10 business days</strong>, depending on your bank
              or payment provider.
            </p>
          </PolicyCard>

          <PolicyCard title="How to request a cancellation/refund" icon="support">
            <p>
              Contact us with your booking details (name, phone, date, and payment/order
              ID). We may ask for additional details to verify the request.
            </p>
          </PolicyCard>

          <PolicyCard title="Important notes" icon="notes">
            <ul className="list-disc space-y-3 pl-5">
              <li>
                Any convenience or gateway charges (if applicable) may be non-refundable.
              </li>
              <li>
                Partial refunds may apply if only part of the booking is cancelled or
                delivered.
              </li>
              <li>
                Final decisions may depend on operator terms and safety requirements.
              </li>
            </ul>
          </PolicyCard>
        </div>
      </div>

      {/* Visual timeline */}
      <section
        className="border-y border-ocean-100 bg-white/70 px-3 py-5 sm:px-6 sm:py-6 lg:px-8"
        aria-labelledby="refund-timeline-heading"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id="refund-timeline-heading"
            className="text-center font-display text-xl font-black tracking-tight text-ocean-900 sm:text-2xl"
          >
            Refund timeline
          </h2>
          <p className="mx-auto mt-1.5 max-w-2xl text-center text-xs leading-relaxed text-ocean-700 sm:text-sm">
            Approved refunds are processed to the original payment method. Typical
            timelines are <strong className="text-ocean-900">5–10 business days</strong>,
            depending on your bank or payment provider.
          </p>

          <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-1">
            {TIMELINE_STEPS.map((step, index) => (
              <li
                key={step}
                className="relative flex flex-col items-center text-center"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-ocean-800 text-xs font-black text-white shadow-md">
                  {index + 1}
                </div>
                <p className="mt-1.5 max-w-[8rem] font-display text-[11px] font-bold text-ocean-900 sm:text-xs">
                  {step}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-center font-display text-sm font-bold text-sky-700 sm:text-base">
            5–10 Business Days
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section
        className="mx-auto max-w-3xl px-3 py-5 sm:px-6 sm:py-6 lg:px-8"
        aria-labelledby="refund-faq-heading"
      >
        <h2
          id="refund-faq-heading"
          className="text-center font-display text-xl font-black tracking-tight text-ocean-900 sm:text-2xl"
        >
          Frequently asked questions
        </h2>
        <p className="mx-auto mt-1 text-center text-xs text-ocean-700 sm:text-sm">
          Quick answers based on this policy.
        </p>
        <div className="mt-3">
          <RefundFaqAccordion items={FAQ_ITEMS} />
        </div>
      </section>

      {/* Support */}
      <section className="mx-auto max-w-5xl px-3 pb-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-br from-ocean-900 via-sky-800 to-cyan-700 p-4 text-white shadow-lg sm:p-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-xl font-black tracking-tight sm:text-2xl">
              Need Help?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-sky-100 sm:text-sm">
              Our booking team is here to help. Contact us with your booking details
              (name, phone, date, and payment/order ID).
            </p>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-bold text-white shadow-md transition hover:bg-[#1ebe57] sm:text-sm"
              aria-label="WhatsApp support"
            >
              <WhatsAppIcon />
              WhatsApp
            </a>
            <a
              href={CONTACT_PHONE_HREF}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-ocean-900 shadow-md transition hover:bg-sky-50 sm:text-sm"
              aria-label={`Call ${CONTACT_PHONE_LABEL}`}
            >
              <PhoneIcon />
              Call Now
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-3 py-2 text-xs font-bold text-white shadow-md backdrop-blur transition hover:bg-white/20 sm:text-sm"
              aria-label={`Email ${CONTACT_EMAIL}`}
            >
              <MailIcon />
              Email Support
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-5xl px-3 pb-8 sm:px-6 sm:pb-10 lg:px-8">
        <div className="rounded-2xl border border-ocean-100 bg-white p-4 text-center shadow-md sm:p-5">
          <h2 className="font-display text-xl font-black tracking-tight text-ocean-900 sm:text-2xl">
            Ready To Book Your Next Adventure?
          </h2>
          <p className="mx-auto mt-1 max-w-xl text-xs leading-relaxed text-ocean-700 sm:text-sm">
            Book your scuba diving experience today.
          </p>
          <div className="mt-3 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
            <Link
              href="/booking"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-ocean-800 px-6 py-2 text-xs font-bold text-white shadow-md transition hover:brightness-110 sm:text-sm"
            >
              Book Now
            </Link>
            <Link
              href="/services"
              className="inline-flex min-h-10 items-center justify-center rounded-full border-2 border-ocean-200 bg-white px-6 py-2 text-xs font-bold text-ocean-900 transition hover:border-ocean-400 hover:bg-ocean-50 sm:text-sm"
            >
              View Packages
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function PolicyCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: "book" | "cancel" | "weather" | "time" | "support" | "notes";
  children: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-ocean-100 border-l-4 border-l-sky-500 bg-white p-3.5 shadow-sm sm:p-4">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-cyan-50 text-ocean-800 [&_svg]:h-5 [&_svg]:w-5">
          <SectionIcon variant={icon} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-black tracking-tight text-ocean-900 sm:text-lg">
            {title}
          </h2>
          <div className="mt-1 h-0.5 w-10 rounded-full bg-gradient-to-r from-sky-500 to-ocean-700" />
        </div>
      </div>
      <div className="mt-2.5 text-sm leading-relaxed text-ocean-800 sm:text-[0.95rem] [&_strong]:text-ocean-950">
        {children}
      </div>
    </article>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.82c0 1.96.52 3.87 1.52 5.55L2 22l4.8-1.55a9.9 9.9 0 0 0 5.24 1.43h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2Zm5.75 14.03c-.24.67-1.4 1.23-1.93 1.31-.49.07-1.12.1-1.81-.11-.41-.13-.95-.31-1.64-.61-2.89-1.25-4.77-4.16-4.92-4.35-.14-.2-1.19-1.58-1.19-3.02 0-1.43.75-2.14 1.02-2.43.27-.29.58-.36.78-.36h.56c.18 0 .42-.06.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.51-.1.2-.15.32-.3.5-.14.17-.3.38-.43.51-.14.14-.29.3-.12.58.16.29.72 1.19 1.55 1.93 1.07.95 1.97 1.25 2.25 1.39.28.14.45.12.61-.07.17-.2.7-.81.88-1.09.19-.28.37-.23.62-.14.26.1 1.63.77 1.91.91.28.14.47.21.54.33.07.11.07.66-.17 1.33Z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V21a1 1 0 01-1 1C10.4 22 2 13.6 2 3a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
