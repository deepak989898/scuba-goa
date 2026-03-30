"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import {
  customerWhatsappLink,
  SITE_NAME,
  SITE_URL,
  whatsappLink,
} from "@/lib/constants";
import { getDb } from "@/lib/firebase";

type Lead = {
  id: string;
  name: string;
  phone: string;
  interestedItem: string;
  preferredDate: string;
  source: string;
  status: string;
  converted: boolean;
  updatedAt: unknown;
  contactedAt?: unknown;
};

function toTs(v: unknown): Timestamp | null {
  if (
    v &&
    typeof v === "object" &&
    "toDate" in v &&
    typeof (v as Timestamp).toDate === "function"
  ) {
    return v as Timestamp;
  }
  return null;
}

function formatTs(v: unknown): string {
  const t = toTs(v);
  if (!t) return "—";
  return t.toDate().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true,
  });
}

const FESTIVALS = ["Holi", "Eid", "Diwali", "Christmas", "New Year", "Long Weekend"];

export default function AdminMarketingPage() {
  const db = getDb();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [offerPct, setOfferPct] = useState(20);
  const [offerText, setOfferText] = useState("Only limited slots left for tomorrow ⚡");
  const [festivalName, setFestivalName] = useState("Diwali");
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const baseUrl = SITE_URL.replace(/\/$/, "");

  async function load() {
    if (!db) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const q = query(
        collection(db, "marketingLeads"),
        orderBy("updatedAt", "desc"),
        limit(300)
      );
      const snap = await getDocs(q);
      const rows: Lead[] = snap.docs.map((d) => {
        const x = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          name: String(x.name ?? ""),
          phone: String(x.phone ?? ""),
          interestedItem: String(x.interestedItem ?? ""),
          preferredDate: String(x.preferredDate ?? ""),
          source: String(x.source ?? ""),
          status: String(x.status ?? ""),
          converted: Boolean(x.converted),
          updatedAt: x.updatedAt,
          contactedAt: x.contactedAt,
        };
      });
      setLeads(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load marketing leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [db]);

  const abandoned = useMemo(
    () =>
      leads.filter(
        (l) => !l.converted && l.phone && l.status !== "booked"
      ),
    [leads]
  );

  const broadcastTemplate = useMemo(
    () =>
      `Hi [Name], ${offerText} Today we have up to ${offerPct}% OFF on selected ${SITE_NAME} plans.\n\nYou checked us recently — want me to lock your slot now?\n\nReply with:\nDate:\nPeople:\nPickup area:`,
    [offerPct, offerText]
  );

  const festivalTemplate = useMemo(
    () =>
      `🎉 ${festivalName} Special!\nHi [Name], festival deal is live: up to ${offerPct}% OFF on selected scuba/tour plans.\nSlots are limited for this week.\n\nBook now: ${baseUrl}/booking`,
    [festivalName, offerPct, baseUrl]
  );

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      setCopied(null);
    }
  }

  async function markContacted(id: string) {
    if (!db) return;
    try {
      await updateDoc(doc(db, "marketingLeads", id), {
        status: "contacted",
        contactedAt: new Date(),
      });
      await load();
    } catch {
      /* ignore */
    }
  }

  if (!db) {
    return (
      <p className="text-ocean-700">
        Firebase client not configured. Set NEXT_PUBLIC_FIREBASE_* to manage marketing
        automation.
      </p>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ocean-900">
        Marketing Automation
      </h1>
      <p className="mt-2 text-sm text-ocean-600">
        Broadcast offers, festival deals, and abandoned-user follow-up queue. Leads are
        captured automatically from booking intent.
      </p>
      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-ocean-100 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-ocean-900">
            Broadcast Offers
          </h2>
          <label className="mt-3 block text-sm text-ocean-700">
            Offer %
            <input
              type="number"
              min={5}
              max={70}
              className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
              value={offerPct}
              onChange={(e) => setOfferPct(Number(e.target.value || 20))}
            />
          </label>
          <label className="mt-3 block text-sm text-ocean-700">
            Urgency line
            <input
              className="mt-1 w-full rounded-xl border border-ocean-200 px-3 py-2"
              value={offerText}
              onChange={(e) => setOfferText(e.target.value)}
            />
          </label>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-sand p-3 text-xs text-ocean-800">
            {broadcastTemplate}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyText("broadcast", broadcastTemplate)}
              className="rounded-full bg-ocean-800 px-4 py-2 text-xs font-semibold text-white"
            >
              {copied === "broadcast" ? "Copied" : "Copy broadcast text"}
            </button>
            <a
              href={whatsappLink(
                "Hi team, please run today's broadcast campaign now."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-ocean-200 bg-white px-4 py-2 text-xs font-semibold text-ocean-800"
            >
              WhatsApp team
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-ocean-100 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-ocean-900">
            Festival Deals
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {FESTIVALS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFestivalName(f)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  festivalName === f
                    ? "border-ocean-700 bg-ocean-700 text-white"
                    : "border-ocean-200 bg-white text-ocean-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-sand p-3 text-xs text-ocean-800">
            {festivalTemplate}
          </pre>
          <button
            type="button"
            onClick={() => copyText("festival", festivalTemplate)}
            className="mt-3 rounded-full bg-ocean-800 px-4 py-2 text-xs font-semibold text-white"
          >
            {copied === "festival" ? "Copied" : "Copy festival text"}
          </button>
        </section>
      </div>

      <section className="mt-8 rounded-2xl border border-ocean-100 bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-ocean-900">
          Abandoned User Follow-up
        </h2>
        <p className="mt-1 text-xs text-ocean-600">
          Leads with booking intent but not converted yet. Send personalized follow-up
          in one click.
        </p>
        {loading ? (
          <p className="mt-4 text-sm text-ocean-600">Loading leads…</p>
        ) : abandoned.length === 0 ? (
          <p className="mt-4 text-sm text-ocean-600">No abandoned leads currently.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {abandoned.map((l) => {
              const firstName = l.name.trim().split(/\s+/)[0] || "there";
              const msg = `Hi ${firstName}, you checked ${
                l.interestedItem || "our scuba plans"
              } recently 😎\nToday we have up to ${offerPct}% OFF on selected plans.\n${
                l.preferredDate ? `For ${l.preferredDate},` : "For tomorrow,"
              } only limited slots left.\n\nBook now: ${baseUrl}/booking`;
              const wa = customerWhatsappLink(l.phone, msg);
              return (
                <li
                  key={l.id}
                  className="rounded-xl border border-ocean-100 bg-sand/40 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ocean-900">
                      {l.name || "Unnamed"} · {l.phone}
                    </p>
                    <p className="text-xs text-ocean-500">
                      Last activity {formatTs(l.updatedAt)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-ocean-700">
                    Interest: {l.interestedItem || "—"} · Preferred date:{" "}
                    {l.preferredDate || "—"} · Source: {l.source || "website"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => void markContacted(l.id)}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900"
                      >
                        WhatsApp follow-up
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => copyText(l.id, msg)}
                      className="rounded-full border border-ocean-200 bg-white px-3 py-1.5 text-xs font-semibold text-ocean-800"
                    >
                      {copied === l.id ? "Copied" : "Copy personalized message"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

