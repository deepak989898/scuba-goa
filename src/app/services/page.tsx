import type { Metadata } from "next";
import { ServicesGrid } from "@/components/ServicesGrid";

export const metadata: Metadata = {
  title: "All Services",
  description:
    "Scuba diving Goa, North & South tours, Dudhsagar, water sports, dolphin trips, casinos, clubs, pubs, disco, flyboarding, bungee.",
};

export default function ServicesPage() {
  return (
    <div className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold text-ocean-900">
          All services
        </h1>
        <p className="mt-3 max-w-2xl text-ocean-700">
          Add services to your cart and pay once with Razorpay, or open any page for
          full details.
        </p>
        <ServicesGrid />
      </div>
    </div>
  );
}
