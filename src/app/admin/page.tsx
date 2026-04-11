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
          href="/admin/offers"
          className="rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm transition hover:border-ocean-300"
        >
          <h2 className="font-display text-lg font-semibold text-ocean-900">
            Offers &amp; promos
          </h2>
          <p className="mt-2 text-sm text-ocean-600">
            Promo codes for online checkout — couple, group, birthday, and custom rules.
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
          href="/admin/hero"
          className="rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm transition hover:border-ocean-300"
        >
          <h2 className="font-display text-lg font-semibold text-ocean-900">
            Hero slider
          </h2>
          <p className="mt-2 text-sm text-ocean-600">
            Homepage hero images: add, reorder, delete.
          </p>
        </Link>
        <Link
          href="/admin/seo-pages"
          className="rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm transition hover:border-ocean-300"
        >
          <h2 className="font-display text-lg font-semibold text-ocean-900">
            SEO guide pages
          </h2>
          <p className="mt-2 text-sm text-ocean-600">
            Public URLs at /guides/… with meta titles, descriptions, images, and booking links.
          </p>
        </Link>
        <Link
          href="/admin/gallery"
          className="rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm transition hover:border-ocean-300"
        >
          <h2 className="font-display text-lg font-semibold text-ocean-900">
            Gallery & reels
          </h2>
          <p className="mt-2 text-sm text-ocean-600">
            Homepage gallery: images and video URLs, reorder with up/down.
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
        <Link
          href="/admin/analytics"
          className="rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm transition hover:border-ocean-300"
        >
          <h2 className="font-display text-lg font-semibold text-ocean-900">
            Analytics
          </h2>
          <p className="mt-2 text-sm text-ocean-600">
            Page views and session counts from the public site.
          </p>
        </Link>
        <Link
          href="/admin/marketing"
          className="rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm transition hover:border-ocean-300"
        >
          <h2 className="font-display text-lg font-semibold text-ocean-900">
            Marketing automation
          </h2>
          <p className="mt-2 text-sm text-ocean-600">
            Broadcast offers, festival campaigns, and abandoned-user follow-up queue.
          </p>
        </Link>
        <Link
          href="/admin/ratings"
          className="rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm transition hover:border-ocean-300"
        >
          <h2 className="font-display text-lg font-semibold text-ocean-900">
            Reviews
          </h2>
          <p className="mt-2 text-sm text-ocean-600">
            Approve or delete guest ratings for the homepage.
          </p>
        </Link>
      </div>
    </div>
  );
}
