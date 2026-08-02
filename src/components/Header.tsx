"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { whatsappLink } from "@/lib/constants";

function MenuIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="h-5 w-5 shrink-0 text-cyan-300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const navIcons = {
  home: (
    <MenuIcon>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-6h5v6" />
    </MenuIcon>
  ),
  services: (
    <MenuIcon>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h10" />
      <circle cx="18.5" cy="17" r="2.5" />
    </MenuIcon>
  ),
  book: (
    <MenuIcon>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
      <path d="M3.5 10h17" />
      <path d="M8 14h4" />
    </MenuIcon>
  ),
  blog: (
    <MenuIcon>
      <path d="M5 4.5h10l4 4V19.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" />
      <path d="M14.5 4.5v4h4" />
      <path d="M8 13h8" />
      <path d="M8 16.5h5" />
    </MenuIcon>
  ),
  guides: (
    <MenuIcon>
      <path d="M5 4.5h5.5a3 3 0 0 1 3 3V20l-3.5-2-3.5 2V7.5a3 3 0 0 1 3-3Z" />
      <path d="M13.5 4.5H19a3 3 0 0 1 3 3V20l-3.5-2-3.5 2V7.5a3 3 0 0 0-3-3" />
    </MenuIcon>
  ),
  gallery: (
    <MenuIcon>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.75" />
      <path d="m3.5 16 4.5-4.5 3.5 3.5L16 11l4.5 5" />
    </MenuIcon>
  ),
  offers: (
    <MenuIcon>
      <path d="M12 3.5 14.2 8l4.8.5-3.6 3.3 1.1 4.7L12 14.3 7.5 16.5l1.1-4.7L5 8.5 9.8 8 12 3.5Z" />
    </MenuIcon>
  ),
  about: (
    <MenuIcon>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.5c1.2-3.2 3.4-4.8 6.5-4.8s5.3 1.6 6.5 4.8" />
    </MenuIcon>
  ),
  contact: (
    <MenuIcon>
      <path d="M4.5 6.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
      <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
    </MenuIcon>
  ),
  reserve: (
    <MenuIcon>
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M3.5 10.5h17" />
      <path d="m9 15.5 2 2 4-4" />
    </MenuIcon>
  ),
  whatsapp: (
    <svg
      className="h-5 w-5 shrink-0 text-emerald-400"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.82c0 1.96.52 3.87 1.52 5.55L2 22l4.8-1.55a9.9 9.9 0 0 0 5.24 1.43h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2Zm5.75 14.03c-.24.67-1.4 1.23-1.93 1.31-.49.07-1.12.1-1.81-.11-.41-.13-.95-.31-1.64-.61-2.89-1.25-4.77-4.16-4.92-4.35-.14-.2-1.19-1.58-1.19-3.02 0-1.43.75-2.14 1.02-2.43.27-.29.58-.36.78-.36h.56c.18 0 .42-.06.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.51-.1.2-.15.32-.3.5-.14.17-.3.38-.43.51-.14.14-.29.3-.12.58.16.29.72 1.19 1.55 1.93 1.07.95 1.97 1.25 2.25 1.39.28.14.45.12.61-.07.17-.2.7-.81.88-1.09.19-.28.37-.23.62-.14.26.1 1.63.77 1.91.91.28.14.47.21.54.33.07.11.07.66-.17 1.33Z" />
    </svg>
  ),
} as const;

const nav = [
  { href: "/", label: "Home", icon: navIcons.home },
  { href: "/services", label: "Services", icon: navIcons.services },
  { href: "/booking", label: "Book", icon: navIcons.book },
  { href: "/blog", label: "Blog", icon: navIcons.blog },
  { href: "/guides", label: "Guides", icon: navIcons.guides },
  { href: "/gallery", label: "Gallery", icon: navIcons.gallery },
  { href: "/offers", label: "Offers", icon: navIcons.offers },
  { href: "/about", label: "About", icon: navIcons.about },
  { href: "/contact", label: "Contact", icon: navIcons.contact },
];

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isOffers = pathname === "/offers";
  /** Transparent nav over full-bleed photo heroes */
  const overHero = isHome || isOffers;
  const isBooking = pathname === "/booking" || pathname?.startsWith("/booking/");
  const [open, setOpen] = useState(false);

  const lightHeader = isBooking;

  return (
    <header
      className={
        overHero
          ? "sticky top-0 z-50 border-b border-white/15 bg-transparent shadow-none backdrop-blur-md"
          : lightHeader
            ? "sticky top-0 z-50 border-b border-ocean-100/90 bg-white/95 shadow-sm backdrop-blur-md"
            : "sticky top-0 z-50 border-b border-slate-700/80 bg-slate-950/90 shadow-depth backdrop-blur-md"
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6 lg:px-8 sm:py-2">
        <Link
          href="/"
          className={
            overHero
              ? "inline-flex items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-ocean-900"
              : lightHeader
                ? "inline-flex items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
                : "inline-flex items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          }
          aria-label="Book Scuba Goa home"
        >
          <Image
            src="/book-scuba-goa-logo-transparent.webp"
            alt="Book Scuba Goa"
            width={240}
            height={88}
            sizes="(max-width: 640px) 120px, 140px"
            className="h-9 w-auto sm:h-10"
            quality={65}
            priority={!isHome}
            fetchPriority={isHome ? "low" : "high"}
          />
        </Link>
        <nav className="hidden items-center gap-0.5 md:flex">
          {nav.map((item) => {
            const active =
              item.href === "/booking"
                ? isBooking
                : item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href ||
                    pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  overHero
                    ? active
                      ? "rounded-full px-3 py-2 text-sm font-bold text-white underline decoration-orange-400 decoration-2 underline-offset-4"
                      : "rounded-full px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-cyan-200"
                    : lightHeader
                      ? active
                        ? "rounded-full bg-sky-500 px-3 py-1.5 text-sm font-bold text-white shadow-sm"
                        : "rounded-full px-3 py-1.5 text-sm font-medium text-ocean-800 transition hover:bg-ocean-50 hover:text-ocean-950"
                      : "rounded-full px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-cyan-300"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className={
              overHero
                ? "hidden rounded-full border border-emerald-800/90 bg-emerald-700 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-black/20 transition hover:bg-emerald-600 sm:inline-flex"
                : lightHeader
                  ? "hidden items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 sm:inline-flex"
                  : "hidden rounded-full border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 sm:inline-flex"
            }
          >
            {lightHeader ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.82c0 1.96.52 3.87 1.52 5.55L2 22l4.8-1.55a9.9 9.9 0 0 0 5.24 1.43h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2Zm5.75 14.03c-.24.67-1.4 1.23-1.93 1.31-.49.07-1.12.1-1.81-.11-.41-.13-.95-.31-1.64-.61-2.89-1.25-4.77-4.16-4.92-4.35-.14-.2-1.19-1.58-1.19-3.02 0-1.43.75-2.14 1.02-2.43.27-.29.58-.36.78-.36h.56c.18 0 .42-.06.66.5.24.58.82 2 .89 2.15.07.15.12.32.02.51-.1.2-.15.32-.3.5-.14.17-.3.38-.43.51-.14.14-.29.3-.12.58.16.29.72 1.19 1.55 1.93 1.07.95 1.97 1.25 2.25 1.39.28.14.45.12.61-.07.17-.2.7-.81.88-1.09.19-.28.37-.23.62-.14.26.1 1.63.77 1.91.91.28.14.47.21.54.33.07.11.07.66-.17 1.33Z" />
              </svg>
            ) : null}
            WhatsApp
          </a>
          <Link
            href="/booking"
            className={
              isBooking
                ? "hidden"
                : "inline-flex min-h-11 min-w-[8.5rem] touch-manipulation items-center justify-center rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-md shadow-cyan-500/30 transition hover:bg-cyan-400 active:bg-cyan-300"
            }
          >
            Reserve Your Dive
          </Link>
          <button
            type="button"
            className={
              overHero
                ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-slate-950/75 text-white shadow-md shadow-black/20 backdrop-blur-sm md:hidden"
                : lightHeader
                  ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-ocean-200 bg-white text-ocean-900 md:hidden"
                  : "inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-slate-900 md:hidden"
            }
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span
              className={
                overHero ? "text-white" : lightHeader ? "text-ocean-900" : "text-slate-100"
              }
            >
              {open ? "✕" : "☰"}
            </span>
          </button>
        </div>
      </div>
      {open ? (
        <div
          className={
            lightHeader
              ? "z-[60] border-t border-ocean-100 bg-white md:hidden"
              : "z-[60] border-t border-slate-700 bg-slate-950 md:hidden"
          }
        >
          <div className="flex flex-col gap-1 px-4 py-3">
            <Link
              href="/booking"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-ocean-gradient px-3 py-3 text-sm font-bold text-white shadow-md"
              onClick={() => setOpen(false)}
            >
              <span className="text-white [&_svg]:text-white">
                {navIcons.reserve}
              </span>
              Reserve Your Dive Today
            </Link>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  lightHeader
                    ? "inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-ocean-900 hover:bg-ocean-50"
                    : "inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-100 hover:bg-slate-800"
                }
                onClick={() => setOpen(false)}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
            <a
              href={whatsappLink(
                "Hi, I want to book scuba diving in Goa. Please share today’s slots."
              )}
              className={
                lightHeader
                  ? "inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-emerald-700 hover:bg-emerald-50"
                  : "inline-flex items-center gap-3 rounded-lg px-3 py-2.5 text-cyan-300 hover:bg-slate-800"
              }
              onClick={() => setOpen(false)}
            >
              {navIcons.whatsapp}
              <span>WhatsApp booking</span>
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
