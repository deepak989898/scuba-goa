"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HotelBookingProgress } from "@/components/hotels/HotelBookingProgress";
import {
  isValidEmail,
  isValidPan,
  isValidPhoneIndia,
} from "@/lib/tripjack-hotels/format";
import {
  hotelSessionGet,
  hotelSessionSet,
  HOTEL_SESSION_KEYS,
} from "@/lib/tripjack-hotels/session";
import type {
  HotelGuestDetails,
  HotelRoomOption,
  HotelSearchRequest,
  RoomGuest,
  RoomGuestRoom,
} from "@/lib/tripjack-hotels/types";

type Selection = {
  hid: string;
  hotelName: string;
  locality?: string;
  option: HotelRoomOption;
  search: HotelSearchRequest | null;
};

export default function HotelGuestsPage() {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("Goa");
  const [state, setState] = useState("Goa");
  const [pincode, setPincode] = useState("");
  const [pan, setPan] = useState("");
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sel = hotelSessionGet<Selection>(HOTEL_SESSION_KEYS.selectedOption);
    if (!sel?.option || !sel.hid) {
      router.replace("/hotels");
      return;
    }
    setSelection(sel);
    const adults = sel.search?.adults ?? 1;
    setGuestNames(Array.from({ length: adults }, () => ""));
  }, [router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selection) return;

    if (!isValidEmail(email)) {
      setError("Enter a valid email.");
      return;
    }
    if (!isValidPhoneIndia(phone)) {
      setError("Enter a valid phone number.");
      return;
    }
    if (pan.trim() && !isValidPan(pan)) {
      setError("PAN format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F).");
      return;
    }

    const adults = selection.search?.adults ?? guestNames.length;
    const trimmed = guestNames.slice(0, adults);
    if (trimmed.some((n) => !n.trim())) {
      setError("Enter all adult guest names.");
      return;
    }

    const guestDetails: HotelGuestDetails = {
      email: email.trim(),
      phone: phone.trim(),
      addressLine: addressLine.trim() || undefined,
      city: city.trim() || "Goa",
      state: state.trim() || "Goa",
      pincode: pincode.trim() || undefined,
      pan: pan.trim().toUpperCase() || undefined,
    };

    const guests: RoomGuest[] = trimmed.map((name) => {
      const parts = name.trim().split(/\s+/);
      return {
        firstName: parts[0] ?? name,
        lastName: parts.slice(1).join(" ") || undefined,
        type: "adult",
      };
    });

    const roomGuestRooms: RoomGuestRoom[] = [
      {
        roomIndex: 0,
        guests,
      },
    ];

    hotelSessionSet(HOTEL_SESSION_KEYS.guestDetails, {
      guestDetails,
      roomGuestRooms,
    });
    router.push("/hotels/review");
  }

  if (!selection) return null;

  return (
    <div className="bg-white py-5 sm:py-7">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <HotelBookingProgress />
        <h1 className="font-display text-2xl font-bold text-ocean-900">Guest details</h1>
        <p className="mt-1 text-sm text-ocean-600">{selection.hotelName}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-ocean-800">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-ocean-800">Phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-ocean-800">Address</span>
            <input
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="font-medium text-ocean-800">City</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ocean-800">State</span>
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ocean-800">Pincode</span>
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-ocean-800">PAN (if required)</span>
            <input
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              className="mt-1 w-full rounded-lg border border-ocean-200 px-3 py-2 uppercase"
            />
            <span className="mt-1 block text-xs text-ocean-500">
              Format: 5 letters + 4 digits + 1 letter
            </span>
          </label>
          <div className="space-y-2">
            <p className="text-sm font-medium text-ocean-800">Adult guest names</p>
            {guestNames.map((name, i) => (
              <input
                key={i}
                value={name}
                onChange={(e) => {
                  const next = [...guestNames];
                  next[i] = e.target.value;
                  setGuestNames(next);
                }}
                placeholder={`Adult ${i + 1} full name`}
                className="w-full rounded-lg border border-ocean-200 px-3 py-2 text-sm"
                required
              />
            ))}
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            className="rounded-full bg-ocean-gradient px-6 py-3 text-sm font-semibold text-white"
          >
            Continue to review
          </button>
        </form>
      </div>
    </div>
  );
}
