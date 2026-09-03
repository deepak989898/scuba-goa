import { Suspense } from "react";
import HotelDetailClient from "./HotelDetailClient";

export default function HotelDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white py-10 text-center text-ocean-600">Loading hotel…</div>
      }
    >
      <HotelDetailClient />
    </Suspense>
  );
}
