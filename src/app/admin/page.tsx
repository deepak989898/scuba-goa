import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ocean-900">Dashboard</h1>
      <p className="mt-2 text-ocean-700">
        Manage Firestore packages and service cards, monitor bookings after Razorpay,
        and keep urgency fields fresh.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/packages"
          className="rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm transition hover:border-ocean-300"
        >
          <h2 className="font-display text-lg font-semibold text-ocean-900">
            Packages
          </h2>
          <p className="mt-2 text-sm text-ocean-600">
            Add / edit scuba, tours, nightlife, adventure SKUs.
          </p>
        </Link>
        <Link
          href="/admin/services"
          className="rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm transition hover:border-ocean-300"
        >
          <h2 className="font-display text-lg font-semibold text-ocean-900">
            Services
          </h2>
          <p className="mt-2 text-sm text-ocean-600">
            Edit home &amp; /services cards (slug = URL). Overrides code defaults.
          </p>
        </Link>
        <Link
          href="/admin/bookings"
          className="rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm transition hover:border-ocean-300"
        >
          <h2 className="font-display text-lg font-semibold text-ocean-900">
            Bookings
          </h2>
          <p className="mt-2 text-sm text-ocean-600">
            Paid orders with Razorpay payment IDs.
          </p>
        </Link>
      </div>
    </div>
  );
}
