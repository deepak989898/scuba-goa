import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-sand px-4 pb-20">
      <Suspense fallback={<p className="mt-12 text-center text-sm text-ocean-700">Loading…</p>}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
