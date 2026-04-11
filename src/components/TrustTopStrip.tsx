"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2a4 4 0 00-4 4v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-2V6a4 4 0 00-4-4zm-2 7V6a2 2 0 114 0v3h-4z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.87 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z" />
    </svg>
  );
}

function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function IconChat({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
    </svg>
  );
}

const items = [
  { Icon: IconLock, label: "Pay safely — Razorpay", short: "Razorpay" },
  { Icon: IconBolt, label: "Book now — instant confirmation", short: "Instant" },
  { Icon: IconStar, label: "10,000+ real dives & smiles", short: "10k+ guests" },
  { Icon: IconChat, label: "Live slots & pickup on WhatsApp", short: "WhatsApp" },
] as const;

type Props = { isHome: boolean };

export function TrustTopStrip({ isHome }: Props) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  if (isAdmin) return null;

  const bar =
    isHome
      ? "border-white/15 bg-slate-950/55 text-white/95 backdrop-blur-md"
      : "border-slate-700/90 bg-slate-900/95 text-slate-200 backdrop-blur-md";

  return (
    <div
      className={`border-t ${bar}`}
      role="region"
      aria-label="Trust and payment assurances"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-1.5 sm:px-6 lg:px-8">
        <ul className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden">
          {items.map(({ Icon, label, short }) => (
            <li
              key={label}
              className="flex shrink-0 items-center gap-1.5 text-[10px] font-medium sm:gap-2 sm:text-xs"
              title={label}
            >
              <Icon
                className={
                  isHome
                    ? "h-3.5 w-3.5 shrink-0 text-cyan-300 sm:h-4 sm:w-4"
                    : "h-3.5 w-3.5 shrink-0 text-cyan-400 sm:h-4 sm:w-4"
                }
              />
              <span className="max-[380px]:sr-only">{label}</span>
              <span className="hidden max-[380px]:inline">{short}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/booking"
          className="shrink-0 touch-manipulation rounded-full bg-cyan-500 px-2.5 py-1.5 text-[10px] font-bold text-slate-950 shadow-sm transition hover:bg-cyan-400 active:opacity-90 sm:px-3 sm:py-1 sm:text-xs"
        >
          Book now
        </Link>
      </div>
    </div>
  );
}
