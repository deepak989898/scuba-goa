"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { whatsappLink } from "@/lib/constants";
import { TrustTopStrip } from "@/components/TrustTopStrip";

const nav = [
  { href: "/", label: "Home" },
  { href: "/offers", label: "Offers" },
  { href: "/services", label: "Services" },
  { href: "/booking", label: "Book" },
  { href: "/blog", label: "Blog" },
  { href: "/guides", label: "Guides" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [open, setOpen] = useState(false);

  return (
    <header
      className={
        isHome
          ? "sticky top-0 z-50 border-b border-white/15 bg-transparent shadow-none backdrop-blur-md"
          : "sticky top-0 z-50 border-b border-slate-700/80 bg-slate-950/90 shadow-depth backdrop-blur-md"
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className={
            isHome
              ? "inline-flex items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-ocean-900"
              : "inline-flex items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          }
          aria-label="Book Scuba Goa home"
        >
          <Image
            src="/book-scuba-goa-logo-transparent.png"
            alt="Book Scuba Goa"
            width={650}
            height={238}
            className="h-12 w-auto sm:h-14"
            priority
          />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                isHome
                  ? "rounded-full px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-cyan-200"
                  : "rounded-full px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-cyan-300"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className={
              isHome
                ? "hidden rounded-full border border-emerald-700/90 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-black/20 transition hover:bg-emerald-500 sm:inline-flex"
                : "hidden rounded-full border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 sm:inline-flex"
            }
          >
            WhatsApp
          </a>
          <Link
            href="/booking"
            className="inline-flex min-h-11 min-w-[5.5rem] touch-manipulation items-center justify-center rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-md shadow-cyan-500/30 transition hover:bg-cyan-400 active:bg-cyan-300"
          >
            Book now
          </Link>
          <button
            type="button"
            className={
              isHome
                ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-slate-950/75 text-white shadow-md shadow-black/20 backdrop-blur-sm md:hidden"
                : "inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-slate-900 md:hidden"
            }
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className={isHome ? "text-white" : "text-slate-100"}>
              {open ? "✕" : "☰"}
            </span>
          </button>
        </div>
      </div>
      <TrustTopStrip isHome={isHome} />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="z-[60] border-t border-slate-700 bg-slate-950 md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              <Link
                href="/booking"
                className="rounded-xl bg-ocean-gradient px-3 py-3 text-center text-sm font-bold text-white shadow-md"
                onClick={() => setOpen(false)}
              >
                Book now — secure checkout
              </Link>
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2.5 text-slate-100 hover:bg-slate-800"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <a
                href={whatsappLink(
                  "Hi, I want to book scuba diving in Goa. Please share today’s slots."
                )}
                className="rounded-lg px-3 py-2.5 text-cyan-300 hover:bg-slate-800"
                onClick={() => setOpen(false)}
              >
                WhatsApp booking
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
