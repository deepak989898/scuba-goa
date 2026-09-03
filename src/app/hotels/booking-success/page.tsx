import { Suspense } from "react";
import HotelBookingSuccessClient from "./HotelBookingSuccessClient";

export default function HotelBookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white py-10 text-center text-ocean-600">Loading…</div>
      }
    >
      <HotelBookingSuccessClient />
    </Suspense>
  );
}
