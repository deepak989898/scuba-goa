"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ADMIN_NAV_SECTIONS,
  adminNavIsActive,
  type AdminNavItem,
  type AdminNavSection,
} from "@/components/admin/admin-nav";

type Props = {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
};

const BADGE_LABEL: Record<NonNullable<AdminNavItem["badge"]>, string> = {
  daily: "Daily",
  action: "Action",
};

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: AdminNavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-sm transition ${
        active
          ? "bg-cyan-500/15 text-white ring-1 ring-cyan-400/40"
          : item.highlight
            ? "bg-white/[0.03] text-cyan-50 hover:bg-white/10 hover:text-white"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span
        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
          active
            ? "bg-cyan-400"
            : item.highlight
              ? "bg-amber-400/90"
              : "bg-slate-600"
        }`}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1">
          <span className={`text-[13px] font-semibold leading-tight ${active ? "text-white" : ""}`}>
            {item.label}
          </span>
          {item.badge ? (
            <span
              className={`rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide ${
                item.badge === "daily"
                  ? "bg-amber-500/20 text-amber-200"
                  : "bg-cyan-500/20 text-cyan-200"
              }`}
            >
              {BADGE_LABEL[item.badge]}
            </span>
          ) : null}
        </span>
        {item.description ? (
          <span className="mt-0.5 block text-[10px] leading-snug text-slate-400 group-hover:text-slate-300">
            {item.description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function NavSection({
  section,
  pathname,
  onNavigate,
}: {
  section: AdminNavSection;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div
      className={`mb-3 last:mb-0 ${
        section.priority
          ? "rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-1.5 pb-2"
          : ""
      }`}
    >
      <div className="mb-1 px-2">
        <p
          className={`text-[9px] font-bold uppercase tracking-widest ${
            section.priority ? "text-amber-200/90" : "text-slate-500"
          }`}
        >
          {section.label}
        </p>
        {section.hint ? (
          <p
            className={`mt-0.5 text-[9px] leading-snug ${
              section.priority ? "text-amber-100/60" : "text-slate-600"
            }`}
          >
            {section.hint}
          </p>
        ) : null}
      </div>
      <ul className="space-y-0.5">
        {section.items.map((item) => (
          <li key={item.href}>
            <NavLink
              item={item}
              active={adminNavIsActive(pathname, item.href)}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminNavDrawer({ open, onClose, onSignOut }: Props) {
  const pathname = usePathname();

  const drawer = (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
        <div>
          <p className="font-display text-sm font-bold text-white">Book Scuba Goa</p>
          <p className="text-[10px] text-slate-400">Admin — check “1 · Check first” daily</p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close menu"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-1.5 py-2" aria-label="Admin navigation">
        {ADMIN_NAV_SECTIONS.map((section) => (
          <NavSection
            key={section.id}
            section={section}
            pathname={pathname}
            onNavigate={onClose}
          />
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <span aria-hidden>↗</span>
          View live website
        </Link>
        <button
          type="button"
          onClick={() => {
            onClose();
            onSignOut();
          }}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
        >
          <span aria-hidden>⎋</span>
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:flex-col">
        {drawer}
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          aria-label="Close menu overlay"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-[60] w-[min(100vw-3rem,19rem)] shadow-2xl transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {drawer}
      </aside>
    </>
  );
}
