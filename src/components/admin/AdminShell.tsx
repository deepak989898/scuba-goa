"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase";
import { AdminNavDrawer } from "@/components/admin/AdminNavDrawer";
import { adminNavCurrentLabel } from "@/components/admin/admin-nav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;

  return <AdminGate>{children}</AdminGate>;
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [allowed, setAllowed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getDb();
    if (!auth || !db) {
      setUser(null);
      return;
    }
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setAllowed(false);
        router.replace("/admin/login");
        return;
      }
      const snap = await getDoc(doc(db, "admins", u.uid));
      setAllowed(snap.exists());
      if (!snap.exists()) {
        await signOut(auth);
        router.replace("/admin/login");
      }
    });
  }, [router]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand text-ocean-700">
        Checking access…
      </div>
    );
  }
  if (!user || !allowed) return null;

  const pageLabel = adminNavCurrentLabel(pathname);

  return (
    <div className="min-h-screen bg-sand lg:pl-64">
      <AdminNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSignOut={() => getFirebaseAuth()?.signOut()}
      />

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-ocean-100 bg-white/95 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ocean-200 bg-white text-ocean-800 shadow-sm transition hover:bg-ocean-50 lg:hidden"
                aria-label="Open admin menu"
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
              >
                <span className="text-base leading-none" aria-hidden>
                  ☰
                </span>
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-ocean-200 bg-white px-2.5 text-xs font-semibold text-ocean-800 shadow-sm transition hover:bg-ocean-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
                aria-label="Go back to previous page"
                title="Go back to previous page"
              >
                <span className="text-base leading-none" aria-hidden>
                  ←
                </span>
                <span className="hidden sm:inline">Back</span>
              </button>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold text-ocean-900 sm:text-lg">
                  {pageLabel}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden max-w-[10rem] truncate text-[11px] text-ocean-600 md:inline">
                {user.email}
              </span>
              <button
                type="button"
                className="rounded-full bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                onClick={() => getFirebaseAuth()?.signOut()}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="admin-dense flex-1 px-3 py-3 sm:px-4 lg:px-5">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const auth = getFirebaseAuth();
    const db = getDb();
    if (!auth || !db) {
      setErr("Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars.");
      return;
    }
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "admins", cred.user.uid));
      if (!snap.exists()) {
        await signOut(auth);
        setErr("This account is not an admin.");
        return;
      }
      router.replace("/admin");
    } catch {
      setErr("Invalid email or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-12 max-w-md rounded-xl border border-ocean-100 bg-white p-6 shadow-sm"
    >
      <h1 className="font-display text-xl font-bold text-ocean-900">Admin login</h1>
      <p className="mt-2 text-sm text-ocean-700">
        Firebase Auth + <code className="text-xs">admins/&lt;uid&gt;</code> doc
        required.
      </p>
      <label className="mt-4 block text-sm font-medium text-ocean-800">
        Email
        <input
          type="email"
          className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-ocean-800">
        Password
        <input
          type="password"
          className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>
      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-full bg-ocean-800 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
