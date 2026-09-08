import type { Metadata } from "next";
import { HotelGuestsCheckoutClient } from "./HotelGuestsCheckoutClient";

export const metadata: Metadata = {
  title: "Hotel guest details",
  robots: { index: false, follow: false },
};

export default function HotelGuestsPage() {
  return (
    <div className="bg-white py-10 sm:py-14">
      <div className="site-container">
        <HotelGuestsCheckoutClient />
      </div>
    </div>
  );
}
