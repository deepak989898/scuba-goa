"use client";

import { useCallback, useEffect, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import type { BookWithUsChatSession } from "@/lib/chat-booking-agent/session-log-types";

async function adminFetch(path: string) {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) throw new Error("Sign in at /admin/login first.");
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

type DayRow = {
  date: string;
  label: string;
  sessionCount: number;
  convertedCount: number;
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function SessionCard({ session }: { session: BookWithUsChatSession }) {
  return (
    <article className="rounded-xl border border-ocean-100 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ocean-900">
            {session.customerName || "Visitor"}
            {session.phone ? ` · ${session.phone}` : ""}
          </p>
          <p className="text-xs text-ocean-600">
            {formatTime(session.updatedAt)} · Step: {session.step}
            {session.converted ? " · ✅ Converted" : ""}
          </p>
        </div>
        <div className="text-right text-xs text-ocean-700">
          {session.tripDate ? <p>📅 Trip: {session.tripDate}</p> : null}
          {session.people ? <p>👥 {session.people} people</p> : null}
          {session.pickup ? <p>📍 {session.pickup}</p> : null}
          {session.cartTotalInr != null ? (
            <p className="font-bold">₹{session.cartTotalInr.toLocaleString("en-IN")}</p>
          ) : null}
        </div>
      </div>

      {session.selectedPackages && session.selectedPackages.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1">
          {session.selectedPackages.map((p) => (
            <li
              key={p}
              className="rounded-full bg-ocean-50 px-2 py-0.5 text-[10px] font-semibold text-ocean-800"
            >
              {p}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 space-y-2 max-h-80 overflow-y-auto rounded-lg border border-ocean-50 bg-sand/40 p-2">
        {session.messages.map((m, i) => (
          <div
            key={`${session.id}-${i}`}
            className={
              m.role === "user"
                ? "ml-4 rounded-xl rounded-br-sm bg-ocean-800 px-3 py-2 text-xs text-white"
                : "mr-2 rounded-xl rounded-bl-sm bg-white px-3 py-2 text-xs text-ocean-900 shadow-sm"
            }
          >
            <span className="block text-[9px] font-bold uppercase opacity-70">
              {m.role === "user" ? "User" : "Desk"}
              {m.step ? ` · ${m.step}` : ""}
            </span>
            <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{m.text}</p>
          </div>
        ))}
      </div>

      {session.paymentId ? (
        <p className="mt-2 text-[10px] font-mono text-ocean-500">
          Payment: {session.paymentId}
        </p>
      ) : null}
    </article>
  );
}

export default function AdminChatLogsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [days, setDays] = useState<DayRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sessionsByDate, setSessionsByDate] = useState<
    Record<string, BookWithUsChatSession[]>
  >({});
  const [loadingDate, setLoadingDate] = useState<string | null>(null);

  const loadDays = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await adminFetch("/api/admin/chat-logs");
      setDays((data.days ?? []) as DayRow[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDays();
  }, [loadDays]);

  async function toggleDate(date: string) {
    if (expanded === date) {
      setExpanded(null);
      return;
    }
    setExpanded(date);
    if (sessionsByDate[date]) return;

    setLoadingDate(date);
    setErr(null);
    try {
      const data = await adminFetch(
        `/api/admin/chat-logs?date=${encodeURIComponent(date)}`,
      );
      setSessionsByDate((prev) => ({
        ...prev,
        [date]: (data.sessions ?? []) as BookWithUsChatSession[],
      }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load chats");
    } finally {
      setLoadingDate(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-lg font-bold text-ocean-900">
            Book with us · Chat logs
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-700">
            Full tap-to-book conversations from the site chat widget. Grouped by
            IST date — expand a day to read every visitor chat and conversion.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadDays()}
          className="rounded-full border border-ocean-200 px-4 py-2 text-sm font-semibold text-ocean-800"
        >
          Refresh
        </button>
      </div>

      {err ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {err}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-ocean-600">Loading…</p>
      ) : days.length === 0 ? (
        <p className="mt-4 text-sm text-ocean-600">
          No chat sessions yet. Conversations appear when visitors use Book with us.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {days.map((day) => {
            const isOpen = expanded === day.date;
            const sessions = sessionsByDate[day.date] ?? [];
            return (
              <section
                key={day.date}
                className="rounded-xl border border-ocean-100 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => void toggleDate(day.date)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-ocean-50/50"
                >
                  <div>
                    <p className="font-display text-base font-bold text-ocean-900">
                      {day.label}
                    </p>
                    <p className="text-xs text-ocean-600">
                      {day.sessionCount} chat{day.sessionCount === 1 ? "" : "s"}
                      {day.convertedCount > 0
                        ? ` · ${day.convertedCount} converted`
                        : ""}
                    </p>
                  </div>
                  <span
                    className="text-sm font-bold text-ocean-500"
                    aria-hidden
                  >
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isOpen ? (
                  <div className="border-t border-ocean-100 bg-sand/30 p-3 space-y-3">
                    {loadingDate === day.date ? (
                      <p className="text-sm text-ocean-600">Loading chats…</p>
                    ) : sessions.length === 0 ? (
                      <p className="text-sm text-ocean-600">No sessions this day.</p>
                    ) : (
                      sessions.map((s) => (
                        <SessionCard key={s.id} session={s} />
                      ))
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
