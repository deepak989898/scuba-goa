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
import Link from "next/link";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;

  return <AdminGate>{children}</AdminGate>;
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [allowed, setAllowed] = useState(false);

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

  if (user === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-ocean-700">
        Checking access…
      </div>
    );
  }
  if (!user || !allowed) return null;

  return (
    <div className="min-h-screen bg-sand">
      <div className="border-b border-ocean-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <p className="font-display font-semibold text-ocean-900">Admin</p>
          <nav className="flex flex-wrap gap-3 text-sm">
            <Link href="/admin" className="text-ocean-700 hover:text-ocean-500">
              Dashboard
            </Link>
            <Link
              href="/admin/packages"
              className="text-ocean-700 hover:text-ocean-500"
            >
              Packages
            </Link>
            <Link
              href="/admin/bookings"
              className="text-ocean-700 hover:text-ocean-500"
            >
              Bookings
            </Link>
            <Link href="/" className="text-ocean-700 hover:text-ocean-500">
              Site
            </Link>
            <button
              type="button"
              className="font-semibold text-red-600"
              onClick={() => getFirebaseAuth()?.signOut()}
            >
              Sign out
            </button>
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
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
      className="mx-auto mt-16 max-w-md rounded-2xl border border-ocean-100 bg-white p-8 shadow-sm"
    >
      <h1 className="font-display text-2xl font-bold text-ocean-900">Admin login</h1>
      <p className="mt-2 text-sm text-ocean-600">
        Firebase Auth + <code className="text-xs">admins/&lt;uid&gt;</code> doc
        required.
      </p>
      <label className="mt-6 block text-sm font-medium text-ocean-800">
        Email
        <input
          type="email"
          className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
      </label>
      <label className="mt-4 block text-sm font-medium text-ocean-800">
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
        className="mt-6 w-full rounded-full bg-ocean-800 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
