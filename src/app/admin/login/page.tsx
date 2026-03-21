import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-sand px-4 pb-20">
      <AdminLoginForm />
    </div>
  );
}
