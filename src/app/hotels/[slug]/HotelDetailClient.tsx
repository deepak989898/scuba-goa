"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HotelGallery } from "@/components/hotels/HotelGallery";
import { formatHotelPriceInr } from "@/lib/goa-hotels/format";
import { pickHotelGalleryImages } from "@/lib/goa-hotels/images";
import {
  computeRoomStayTotalInr,
  countHotelNights,
  defaultCheckOutFrom,
  minCheckInIso,
} from "@/lib/goa-hotels/pricing";
import { setHotelBookingDraft } from "@/lib/goa-hotels/session";
import type { GoaHotelDoc, GoaHotelRoom } from "@/lib/goa-hotels/types";

type Props = {
  hotel: GoaHotelDoc;
};

export function HotelDetailClient({ hotel }: Props) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(minCheckInIso());
  const [checkOut, setCheckOut] = useState(defaultCheckOutFrom(minCheckInIso()));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [roomId, setRoomId] = useState(hotel.rooms[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const nights = countHotelNights(checkIn, checkOut);
  const selectedRoom = hotel.rooms.find((r) => r.id === roomId) ?? null;

  const totalInr = useMemo(() => {
    if (!selectedRoom || nights < 1) return 0;
    return computeRoomStayTotalInr(selectedRoom.pricePerNight, nights);
  }, [selectedRoom, nights]);

  const gallery = pickHotelGalleryImages(hotel, 50);

  function onCheckInChange(v: string) {
    setCheckIn(v);
    if (checkOut <= v) setCheckOut(defaultCheckOutFrom(v));
  }

  function continueToGuests() {
    setError(null);
    if (!selectedRoom) {
      setError("Please select a room.");
      return;
    }
    if (nights < 1) {
      setError("Check-out must be after check-in.");
      return;
    }
    if (selectedRoom.maxGuests > 0 && adults + children > selectedRoom.maxGuests) {
      setError(`This room allows up to ${selectedRoom.maxGuests} guests.`);
      return;
    }
    if (totalInr < 100) {
      setError("Rates are updating for this room — please try again later or contact us on WhatsApp.");
      return;
    }

    setHotelBookingDraft({
      hotelId: hotel.id,
      hotelSlug: hotel.slug,
      hotelName: hotel.name,
      roomId: selectedRoom.id,
      roomName: selectedRoom.name,
      mealBasisLabel: selectedRoom.mealBasisLabel,
      checkIn,
      checkOut,
      nights,
      adults,
      children,
      pricePerNight: selectedRoom.pricePerNight,
      totalAmountInr: totalInr,
    });
    router.push("/hotels/guests");
  }

  return (
    <div className="space-y-8">
      <HotelGallery images={gallery} title={hotel.name} />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="font-display text-3xl font-bold text-ocean-900">{hotel.name}</h1>
          <p className="mt-2 text-ocean-600">
            {hotel.location}
            {hotel.starRating ? ` · ${hotel.starRating} star` : ""}
          </p>
          {hotel.address ? (
            <p className="mt-1 text-sm text-ocean-500">{hotel.address}</p>
          ) : null}

          {hotel.description ? (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold text-ocean-900">Overview</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ocean-800">
                {hotel.description}
              </p>
            </section>
          ) : null}

          {hotel.facilities.length > 0 ? (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold text-ocean-900">Facilities</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {hotel.facilities.map((f) => (
                  <li
                    key={f}
                    className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-medium text-ocean-800"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hotel.policies.length > 0 ? (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold text-ocean-900">Policies</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ocean-800">
                {hotel.policies.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="rounded-2xl border border-ocean-100 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold text-ocean-900">Book a room</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-ocean-700">Check-in</span>
              <input
                type="date"
                value={checkIn}
                min={minCheckInIso()}
                onChange={(e) => onCheckInChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ocean-700">Check-out</span>
              <input
                type="date"
                value={checkOut}
                min={defaultCheckOutFrom(checkIn)}
                onChange={(e) => setCheckOut(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ocean-700">Adults</span>
              <input
                type="number"
                min={1}
                max={12}
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ocean-700">Children</span>
              <input
                type="number"
                min={0}
                max={8}
                value={children}
                onChange={(e) => setChildren(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
              />
            </label>
          </div>

          <div className="mt-5 space-y-3">
            {hotel.rooms.length === 0 ? (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Rates are updating for this hotel.{" "}
                {hotel.priceFrom > 0
                  ? `Indicative from ${formatHotelPriceInr(hotel.priceFrom)} / night.`
                  : "Please contact us on WhatsApp."}
              </p>
            ) : (
              hotel.rooms.map((room) => (
                <RoomOption
                  key={room.id}
                  room={room}
                  nights={nights}
                  selected={roomId === room.id}
                  onSelect={() => setRoomId(room.id)}
                />
              ))
            )}
          </div>

          {nights > 0 && totalInr > 0 ? (
            <p className="mt-4 text-sm text-ocean-700">
              {nights} night(s) ·{" "}
              <strong className="text-ocean-900">{formatHotelPriceInr(totalInr)}</strong> total
            </p>
          ) : null}

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          <button
            type="button"
            disabled={hotel.rooms.length === 0}
            onClick={continueToGuests}
            className="mt-5 w-full rounded-full bg-ocean-gradient px-6 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50"
          >
            Continue to guest details
          </button>
        </aside>
      </div>
    </div>
  );
}

function RoomOption({
  room,
  nights,
  selected,
  onSelect,
}: {
  room: GoaHotelRoom;
  nights: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const nightly = room.pricePerNight;
  const total =
    nights > 0 && nightly > 0 ? computeRoomStayTotalInr(nightly, nights) : nightly;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-3 text-left transition ${
        selected
          ? "border-cyan-500 bg-cyan-50"
          : "border-ocean-100 hover:border-ocean-200"
      }`}
    >
      <p className="font-semibold text-ocean-900">{room.name}</p>
      <p className="text-xs text-ocean-600">
        {room.mealBasisLabel || room.type}
        {room.isRefundable ? " · Refundable" : " · Non-refundable"}
      </p>
      <p className="mt-1 text-sm font-bold text-ocean-900">
        {nightly > 0
          ? `${formatHotelPriceInr(nightly)} / night`
          : "Rate updating"}
        {nights > 1 && nightly > 0 ? ` · ${formatHotelPriceInr(total)} total` : ""}
      </p>
    </button>
  );
}
