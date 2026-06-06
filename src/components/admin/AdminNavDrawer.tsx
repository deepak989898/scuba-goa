"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ADMIN_NAV_SECTIONS,
  adminNavIsActive,
  type AdminNavItem,
} from "@/components/admin/admin-nav";

type Props = {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
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
      className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
        active
          ? "bg-cyan-500/15 text-white ring-1 ring-cyan-400/40"
          : item.highlight
            ? "text-cyan-100 hover:bg-white/10 hover:text-white"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          active ? "bg-cyan-400" : item.highlight ? "bg-cyan-500/70" : "bg-slate-600"
        }`}
        aria-hidden
      />
      <span className="min-w-0">
        <span className={`block font-semibold leading-tight ${active ? "text-white" : ""}`}>
          {item.label}
        </span>
        {item.description ? (
          <span className="mt-0.5 block text-[11px] leading-snug text-slate-400 group-hover:text-slate-300">
            {item.description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function AdminNavDrawer({ open, onClose, onSignOut }: Props) {
  const pathname = usePathname();

  const drawer = (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div>
          <p className="font-display text-base font-bold text-white">Book Scuba Goa</p>
          <p className="text-xs text-slate-400">Admin control panel</p>
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

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
        {ADMIN_NAV_SECTIONS.map((section) => (
          <div key={section.id} className="mb-6 last:mb-0">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    active={adminNavIsActive(pathname, item.href)}
                    onNavigate={onClose}
                  />
                </li>
              ))}
            </ul>
          </div>
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
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-slate-800 lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:flex-col">
        {drawer}
      </aside>

      {/* Mobile drawer + backdrop */}
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          aria-label="Close menu overlay"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-[60] w-[min(100vw-3rem,18rem)] shadow-2xl transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {drawer}
      </aside>
    </>
  );
}
