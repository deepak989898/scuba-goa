"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import type { HotelBookingDoc, HotelBookingStatus } from "@/lib/tripjack-hotels/types";
import { formatHotelPriceInr } from "@/lib/tripjack-hotels/format";

const FILTERS: { id: string; label: string; status?: HotelBookingStatus }[] = [
  { id: "pending", label: "Paid · pending confirm", status: "pending_admin_confirmation" },
  { id: "confirmed", label: "Confirmed", status: "confirmed" },
  { id: "failed", label: "Payment failed", status: "payment_failed" },
  { id: "all", label: "All" },
];

export default function AdminHotelBookingsPage() {
  const [filter, setFilter] = useState("pending");
  const [bookings, setBookings] = useState<HotelBookingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HotelBookingDoc | null>(null);
  const [supplierConfirmation, setSupplierConfirmation] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
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
      const res = await authorizedFetch(`/api/admin/hotel-bookings${q}`);
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
        `/api/admin/hotel-bookings/${encodeURIComponent(selected.bookingId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark_confirmed",
            supplierConfirmation,
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

  async function syncCatalog() {
    setSyncMsg(null);
    try {
      const res = await authorizedFetch("/api/admin/hotels/catalog-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 200 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setSyncMsg(data.message ?? `Synced ${data.hidsCount} hotels`);
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : "Sync failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-lg font-bold text-ocean-900">Hotel bookings</h1>
          <p className="mt-1 text-sm text-ocean-600">
            Goa hotels via TripJack catalog. Payment success does not auto-confirm with supplier —
            mark confirmed manually after voucher.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void syncCatalog()}
          className="rounded-full border border-ocean-300 px-4 py-2 text-sm font-semibold text-ocean-800"
        >
          Sync Goa catalog
        </button>
      </div>
      {syncMsg && <p className="text-sm text-ocean-700">{syncMsg}</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === f.id
                ? "bg-ocean-800 text-white"
                : "bg-ocean-50 text-ocean-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ocean-600">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-ocean-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-ocean-50 text-ocean-700">
                <tr>
                  <th className="px-3 py-2">Booking</th>
                  <th className="px-3 py-2">Hotel</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr
                    key={b.bookingId}
                    className={`border-t border-ocean-50 cursor-pointer hover:bg-ocean-50/50 ${
                      selected?.bookingId === b.bookingId ? "bg-cyan-50" : ""
                    }`}
                    onClick={() => {
                      setSelected(b);
                      setSupplierConfirmation(b.supplierConfirmation ?? "");
                      setAdminNotes(b.adminNotes ?? "");
                      setActionMsg(null);
                    }}
                  >
                    <td className="px-3 py-2 font-mono text-xs">{b.bookingId}</td>
                    <td className="px-3 py-2">{b.hotelName}</td>
                    <td className="px-3 py-2">
                      {formatHotelPriceInr(b.totalFare, b.currency)}
                    </td>
                    <td className="px-3 py-2 text-xs">{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <p className="p-4 text-sm text-ocean-600">No bookings in this filter.</p>
            )}
          </div>

          <div className="rounded-xl border border-ocean-100 p-4">
            {selected ? (
              <div className="space-y-3 text-sm text-ocean-800">
                <h2 className="font-semibold text-ocean-900">Booking detail</h2>
                <p><strong>ID:</strong> {selected.bookingId}</p>
                <p><strong>Hotel:</strong> {selected.hotelName}</p>
                <p><strong>Dates:</strong> {selected.checkIn} → {selected.checkOut}</p>
                <p><strong>Room:</strong> {selected.roomName ?? "—"}</p>
                <p><strong>Guest:</strong> {selected.guestDetails.email} · {selected.guestDetails.phone}</p>
                <p><strong>Amount:</strong> {formatHotelPriceInr(selected.totalFare, selected.currency)}</p>
                <p><strong>Payment:</strong> {selected.paymentStatus}</p>
                {selected.razorpayPaymentId && (
                  <p><strong>Razorpay:</strong> {selected.razorpayPaymentId}</p>
                )}
                {selected.tripjackReviewBookingId && (
                  <p><strong>TJ review ID:</strong> {selected.tripjackReviewBookingId}</p>
                )}
                {selected.status !== "confirmed" && selected.paymentStatus === "paid" && (
                  <div className="mt-4 space-y-2 border-t border-ocean-100 pt-4">
                    <label className="block">
                      <span className="text-xs font-medium text-ocean-600">Supplier confirmation / voucher</span>
                      <input
                        value={supplierConfirmation}
                        onChange={(e) => setSupplierConfirmation(e.target.value)}
                        className="mt-1 w-full rounded border border-ocean-200 px-2 py-1.5"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-ocean-600">Admin notes</span>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={3}
                        className="mt-1 w-full rounded border border-ocean-200 px-2 py-1.5"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void markConfirmed()}
                      className="rounded-full bg-ocean-gradient px-4 py-2 text-sm font-semibold text-white"
                    >
                      Mark confirmed
                    </button>
                  </div>
                )}
                {actionMsg && <p className="text-sm text-ocean-700">{actionMsg}</p>}
              </div>
            ) : (
              <p className="text-sm text-ocean-600">Select a booking to view details.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
