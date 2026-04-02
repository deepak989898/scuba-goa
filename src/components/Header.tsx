"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { whatsappLink } from "@/lib/constants";

const nav = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/booking", label: "Book" },
  { href: "/blog", label: "Blog" },
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
                ? "hidden rounded-full border border-white/40 px-3 py-2 text-sm font-medium text-white transition hover:border-cyan-200 hover:bg-white/10 sm:inline-flex"
                : "hidden rounded-full border border-slate-600 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-400 hover:bg-slate-800 sm:inline-flex"
            }
          >
            WhatsApp
          </a>
          <Link
            href="/booking"
            className="inline-flex min-h-11 min-w-[5.5rem] items-center justify-center rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-500/30 transition hover:bg-cyan-400 active:bg-cyan-300"
          >
            Book Now
          </Link>
          <button
            type="button"
            className={
              isHome
                ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 text-white md:hidden"
                : "inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 md:hidden"
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
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={
              isHome
                ? "border-t border-white/15 bg-slate-950/95 backdrop-blur-md md:hidden"
                : "border-t border-slate-700 bg-slate-950 md:hidden"
            }
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-slate-200 hover:bg-slate-800"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <a
                href={whatsappLink()}
                className="rounded-lg px-3 py-2 text-cyan-300 hover:bg-slate-800"
                onClick={() => setOpen(false)}
              >
                WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
