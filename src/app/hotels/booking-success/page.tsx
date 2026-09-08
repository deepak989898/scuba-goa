import { Suspense } from "react";
import HotelBookingSuccessClient from "./HotelBookingSuccessClient";

export default function HotelBookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="site-container py-16 text-center text-sm text-ocean-600">
          Loading…
        </div>
      }
    >
      <HotelBookingSuccessClient />
    </Suspense>
  );
}
