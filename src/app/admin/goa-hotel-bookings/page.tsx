"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import type { GoaHotelBookingDoc, GoaHotelBookingStatus } from "@/lib/goa-hotels/types";
import { formatHotelDateLabel, formatHotelPriceInr } from "@/lib/goa-hotels/format";

const FILTERS: { id: string; label: string; status?: GoaHotelBookingStatus }[] = [
  { id: "paid", label: "Paid · pending confirm", status: "paid" },
  { id: "confirmed", label: "Confirmed", status: "confirmed" },
  { id: "all", label: "All" },
];

export default function AdminGoaHotelBookingsPage() {
  const [filter, setFilter] = useState("paid");
  const [bookings, setBookings] = useState<GoaHotelBookingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GoaHotelBookingDoc | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeFilter = FILTERS.find((f) => f.id === filter);

  const authorizedFetch = useCallback(async (input: string, init?: RequestInit) => {
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    if (!user) throw new Error("Sign in again");
    const token = await user.getIdToken(true);
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = activeFilter?.status
        ? `?status=${encodeURIComponent(activeFilter.status)}`
        : "";
      const res = await authorizedFetch(`/api/admin/goa-hotel-bookings${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Load failed");
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch, activeFilter?.status]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => bookings, [bookings]);

  async function markConfirmed() {
    if (!selected) return;
    setActionMsg(null);
    try {
      const res = await authorizedFetch(
        `/api/admin/goa-hotel-bookings/${encodeURIComponent(selected.bookingId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark_confirmed",
            adminNotes,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      setActionMsg("Marked confirmed.");
      setSelected(data.booking ?? null);
      await load();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lg font-bold text-ocean-900">Goa hotel bookings</h1>
        <p className="mt-1 text-sm text-ocean-600">
          Catalog from Safar Sathi <code className="text-xs">goaHotels</code> · payments via
          Book Scuba Goa Razorpay · stored in <code className="text-xs">goaHotelBookings</code>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              filter === f.id
                ? "bg-cyan-600 text-white"
                : "bg-ocean-100 text-ocean-800 hover:bg-ocean-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-ocean-600">Loading…</p> : null}

      <div className="overflow-x-auto rounded-xl border border-ocean-100 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ocean-50 text-ocean-700">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Guest</th>
              <th className="px-3 py-2">Hotel</th>
              <th className="px-3 py-2">Stay</th>
              <th className="px-3 py-2">Paid</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr
                key={b.bookingId}
                className={`cursor-pointer border-t border-ocean-50 hover:bg-cyan-50/40 ${
                  selected?.bookingId === b.bookingId ? "bg-cyan-50" : ""
                }`}
                onClick={() => {
                  setSelected(b);
                  setAdminNotes(b.adminNotes ?? "");
                  setActionMsg(null);
                }}
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  {b.createdAt?.slice(0, 10) ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <div>{b.guestName}</div>
                  <div className="text-xs text-ocean-500">{b.phone}</div>
                </td>
                <td className="px-3 py-2">{b.hotelName}</td>
                <td className="px-3 py-2 text-xs">
                  {formatHotelDateLabel(b.checkIn)} → {formatHotelDateLabel(b.checkOut)}
                </td>
                <td className="px-3 py-2">{formatHotelPriceInr(b.totalAmountInr)}</td>
                <td className="px-3 py-2 capitalize">{b.status.replace(/_/g, " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? (
          <p className="p-6 text-sm text-ocean-600">No bookings in this filter.</p>
        ) : null}
      </div>

      {selected ? (
        <div className="rounded-xl border border-ocean-100 bg-white p-5">
          <h2 className="font-semibold text-ocean-900">Booking details</h2>
          <div className="mt-3 space-y-1 text-sm text-ocean-800">
            <p><strong>Payment ID:</strong> {selected.bookingId}</p>
            <p><strong>Email:</strong> {selected.email}</p>
            <p><strong>Room:</strong> {selected.roomName}</p>
            <p><strong>Guests:</strong> {selected.adults} adult(s){selected.children ? `, ${selected.children} child(ren)` : ""}</p>
          </div>
          <label className="mt-4 block text-sm">
            <span className="font-medium text-ocean-800">Admin notes / voucher ref</span>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
            />
          </label>
          {selected.status === "paid" ? (
            <button
              type="button"
              onClick={() => void markConfirmed()}
              className="mt-4 rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white"
            >
              Mark confirmed with hotel
            </button>
          ) : null}
          {actionMsg ? <p className="mt-3 text-sm text-ocean-700">{actionMsg}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
