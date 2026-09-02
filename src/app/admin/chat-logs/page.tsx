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

type UserGroup = {
  key: string;
  label: string;
  phone?: string;
  sessions: BookWithUsChatSession[];
  converted: boolean;
  lastAt: string;
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

function userKeyForSession(s: BookWithUsChatSession): string {
  const phone = s.phone?.trim().replace(/\D/g, "");
  if (phone && phone.length >= 10) return `phone:${phone}`;
  const name = s.customerName?.trim();
  if (name) return `name:${name.toLowerCase()}`;
  return `session:${s.sessionId}`;
}

function userLabelForSession(s: BookWithUsChatSession): string {
  if (s.customerName?.trim()) return s.customerName.trim();
  if (s.phone?.trim()) return s.phone.trim();
  return "Visitor";
}

/** Visitor shared name, email, or phone in the booking chat flow. */
function sessionHasSavedContact(s: BookWithUsChatSession): boolean {
  const phone = s.phone?.replace(/\D/g, "") ?? "";
  if (phone.length >= 10) return true;
  const email = s.email?.trim() ?? "";
  if (email.includes("@") && email.includes(".")) return true;
  const name = s.customerName?.trim() ?? "";
  if (name.length >= 2) return true;
  return false;
}

function filterSessions(
  sessions: BookWithUsChatSession[],
  contactOnly: boolean,
): BookWithUsChatSession[] {
  if (!contactOnly) return sessions;
  return sessions.filter(sessionHasSavedContact);
}

function groupSessionsByUser(
  sessions: BookWithUsChatSession[],
  contactOnly = false,
): UserGroup[] {
  const filtered = filterSessions(sessions, contactOnly);
  const map = new Map<string, UserGroup>();
  for (const s of filtered) {
    const key = userKeyForSession(s);
    const existing = map.get(key);
    if (existing) {
      existing.sessions.push(s);
      if (s.converted) existing.converted = true;
      if ((s.updatedAt || "") > existing.lastAt) existing.lastAt = s.updatedAt;
    } else {
      map.set(key, {
        key,
        label: userLabelForSession(s),
        phone: s.phone?.trim() || undefined,
        sessions: [s],
        converted: s.converted,
        lastAt: s.updatedAt || s.createdAt,
      });
    }
  }
  return [...map.values()]
    .map((g) => ({
      ...g,
      sessions: [...g.sessions].sort((a, b) =>
        (b.updatedAt || "").localeCompare(a.updatedAt || ""),
      ),
    }))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

function ConversationBody({ session }: { session: BookWithUsChatSession }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-ocean-700">
        <p>
          {formatTime(session.updatedAt)} · Step: {session.step}
          {session.converted ? " · ✅ Converted" : ""}
        </p>
        <div className="text-right">
          {session.tripDate ? <p>📅 {session.tripDate}</p> : null}
          {session.people ? <p>👥 {session.people} people</p> : null}
          {session.pickup ? <p>📍 {session.pickup}</p> : null}
          {session.email ? <p>✉️ {session.email}</p> : null}
          {session.cartTotalInr != null ? (
            <p className="font-bold text-ocean-900">
              ₹{session.cartTotalInr.toLocaleString("en-IN")}
            </p>
          ) : null}
        </div>
      </div>

      {session.selectedPackages && session.selectedPackages.length > 0 ? (
        <ul className="flex flex-wrap gap-1">
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

      <div className="space-y-2 max-h-96 overflow-y-auto rounded-lg border border-ocean-100 bg-white p-2">
        {session.messages.map((m, i) => (
          <div
            key={`${session.id}-${i}`}
            className={
              m.role === "user"
                ? "ml-4 rounded-xl rounded-br-sm bg-ocean-800 px-3 py-2 text-xs text-white"
                : "mr-2 rounded-xl rounded-bl-sm bg-ocean-50 px-3 py-2 text-xs text-ocean-900"
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
        <p className="text-[10px] font-mono text-ocean-500">
          Payment: {session.paymentId}
        </p>
      ) : null}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span className="text-sm font-bold text-ocean-500" aria-hidden>
      {open ? "▲" : "▼"}
    </span>
  );
}

export default function AdminChatLogsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [days, setDays] = useState<DayRow[]>([]);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [sessionsByDate, setSessionsByDate] = useState<
    Record<string, BookWithUsChatSession[]>
  >({});
  const [loadingDate, setLoadingDate] = useState<string | null>(null);
  const [contactOnly, setContactOnly] = useState(false);

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
    const next = new Set(expandedDates);
    if (next.has(date)) {
      next.delete(date);
      setExpandedDates(next);
      return;
    }
    next.add(date);
    setExpandedDates(next);

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

  function toggleUser(date: string, userKey: string) {
    const id = `${date}:${userKey}`;
    const next = new Set(expandedUsers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedUsers(next);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-lg font-bold text-ocean-900">
            Book with us · Chat logs
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ocean-700">
            Tap a date → tap a visitor → read the full conversation. Grouped by
            IST day and visitor (phone / name).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadDays()}
            className="rounded-full border border-ocean-200 px-4 py-2 text-sm font-semibold text-ocean-800"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setContactOnly(false)}
          className={`rounded-full px-4 py-2 text-xs font-bold ${
            !contactOnly
              ? "bg-ocean-800 text-white"
              : "border border-ocean-200 text-ocean-800"
          }`}
        >
          All chats
        </button>
        <button
          type="button"
          onClick={() => setContactOnly(true)}
          className={`rounded-full px-4 py-2 text-xs font-bold ${
            contactOnly
              ? "bg-teal-700 text-white"
              : "border border-ocean-200 text-ocean-800"
          }`}
        >
          With name / email / phone
        </button>
        {contactOnly ? (
          <span className="text-xs text-ocean-600">
            Showing visitors who saved contact details in chat
          </span>
        ) : null}
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
            const dateOpen = expandedDates.has(day.date);
            const sessions = sessionsByDate[day.date] ?? [];
            const filteredSessions = filterSessions(sessions, contactOnly);
            const userGroups = groupSessionsByUser(sessions, contactOnly);

            if (contactOnly && sessions.length > 0 && userGroups.length === 0) {
              return null;
            }

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
                      {contactOnly && sessions.length > 0
                        ? `${filteredSessions.length} with contact`
                        : `${day.sessionCount} chat${day.sessionCount === 1 ? "" : "s"}`}
                      {day.convertedCount > 0
                        ? ` · ${day.convertedCount} converted`
                        : ""}
                    </p>
                  </div>
                  <Chevron open={dateOpen} />
                </button>

                {dateOpen ? (
                  <div className="border-t border-ocean-100 bg-sand/20 px-2 py-2">
                    {loadingDate === day.date ? (
                      <p className="px-2 py-2 text-sm text-ocean-600">
                        Loading visitors…
                      </p>
                    ) : userGroups.length === 0 ? (
                      <p className="px-2 py-2 text-sm text-ocean-600">
                        {contactOnly
                          ? "No visitors with saved contact on this day."
                          : "No chats this day."}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {userGroups.map((group) => {
                          const userId = `${day.date}:${group.key}`;
                          const userOpen = expandedUsers.has(userId);
                          const displayPhone =
                            group.phone &&
                            !group.label.includes(group.phone)
                              ? group.phone
                              : null;

                          return (
                            <div
                              key={userId}
                              className="rounded-lg border border-ocean-100 bg-white"
                            >
                              <button
                                type="button"
                                onClick={() => toggleUser(day.date, group.key)}
                                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-ocean-50/60"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-ocean-900">
                                    {group.label}
                                    {displayPhone ? ` · ${displayPhone}` : ""}
                                    {group.converted ? (
                                      <span className="ml-1 text-emerald-700">
                                        ✅
                                      </span>
                                    ) : null}
                                  </p>
                                  <p className="text-xs text-ocean-600">
                                    {group.sessions.length} conversation
                                    {group.sessions.length === 1 ? "" : "s"} ·
                                    Last {formatTime(group.lastAt)}
                                  </p>
                                </div>
                                <Chevron open={userOpen} />
                              </button>

                              {userOpen ? (
                                <div className="space-y-3 border-t border-ocean-50 bg-sand/30 p-3">
                                  {group.sessions.map((session, idx) => (
                                    <div key={session.id}>
                                      {group.sessions.length > 1 ? (
                                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-ocean-500">
                                          Chat {idx + 1} ·{" "}
                                          {formatTime(session.updatedAt)}
                                        </p>
                                      ) : null}
                                      <ConversationBody session={session} />
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
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
