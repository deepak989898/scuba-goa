"use client";

import { useCallback, useEffect, useState } from "react";

type GbpPublicSettings = {
  enabled: boolean;
  accountId: string;
  locationId: string;
  locationTitle: string;
  connectedAt: string | null;
  lastPostAt: string | null;
  lastPostSlug: string | null;
  lastPostError: string | null;
  hasRefreshToken: boolean;
  configured: boolean;
};

type GbpAccount = { accountId: string; accountName: string };
type GbpLocation = { accountId: string; locationId: string; title: string };

async function adminFetch(path: string, init?: RequestInit) {
  const auth = (await import("@/lib/firebase")).getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) throw new Error("Sign in at /admin/login first.");
  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export function GoogleBusinessSection({
  onMessage,
}: {
  onMessage: (msg: { ok?: string; err?: string }) => void;
}) {
  const [settings, setSettings] = useState<GbpPublicSettings | null>(null);
  const [redirectUri, setRedirectUri] = useState("");
  const [clientConfigured, setClientConfigured] = useState(false);
  const [accounts, setAccounts] = useState<GbpAccount[]>([]);
  const [locations, setLocations] = useState<GbpLocation[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [manualAccountId, setManualAccountId] = useState("");
  const [manualLocationId, setManualLocationId] = useState("");
  const [manualLocationTitle, setManualLocationTitle] = useState("");

  const loadStatus = useCallback(async () => {
    const data = await adminFetch("/api/admin/google-business/status");
    setSettings(data.settings);
    setRedirectUri(data.oauth?.redirectUri ?? "");
    setClientConfigured(Boolean(data.oauth?.clientIdConfigured));
    if (data.settings?.accountId) {
      setSelectedAccount(data.settings.accountId);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    setBusy("accounts");
    try {
      const data = await adminFetch("/api/admin/google-business/locations");
      const accs = (data.accounts ?? []) as GbpAccount[];
      setAccounts(accs);
      const parts: string[] = [];
      if (typeof data.warning === "string" && data.warning.trim()) {
        parts.push(data.warning.trim());
      }
      if (data.cached === true) {
        parts.push("Using cached account list from a previous successful load.");
      }
      if (accs.length === 0) {
        onMessage({
          err:
            parts.join(" ") ||
            "No Google Business accounts returned. Use manual IDs in the section below, or connect the Google account that manages your listing.",
        });
        return;
      }
      parts.push(`Found ${accs.length} account(s). Pick one in the dropdown.`);
      if (accs.length === 1) {
        const id = accs[0].accountId;
        setSelectedAccount(id);
        parts.push(
          "Only one account: choose it in the dropdown, wait a few seconds, then choose it again to load locations (reduces Google rate limits).",
        );
      }
      onMessage({ ok: parts.join(" ") });
    } catch (e) {
      onMessage({ err: e instanceof Error ? e.message : "Could not list accounts" });
    } finally {
      setBusy(null);
    }
  }, [onMessage]);

  useEffect(() => {
    if (!settings) return;
    setManualAccountId(settings.accountId);
    setManualLocationId(settings.locationId);
    setManualLocationTitle(settings.locationTitle);
  }, [settings?.accountId, settings?.locationId, settings?.locationTitle]);

  useEffect(() => {
    loadStatus().catch((e) =>
      onMessage({ err: e instanceof Error ? e.message : "Failed to load GBP settings" }),
    );
  }, [loadStatus, onMessage]);

  async function connectGoogle() {
    setBusy("connect");
    try {
      const data = await adminFetch("/api/admin/google-business/auth-url", {
        method: "POST",
      });
      window.location.href = data.url;
    } catch (e) {
      onMessage({ err: e instanceof Error ? e.message : "Connect failed" });
      setBusy(null);
    }
  }

  async function saveEnabled(enabled: boolean) {
    setBusy("enabled");
    try {
      const data = await adminFetch("/api/admin/google-business/settings", {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
      setSettings(data.settings);
      onMessage({
        ok: enabled
          ? "Auto-post to Google Business enabled."
          : "Google Business auto-post disabled.",
      });
    } catch (e) {
      onMessage({ err: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setBusy(null);
    }
  }

  async function loadLocations(accountId: string) {
    if (!accountId) return;
    setBusy("locations");
    try {
      const data = await adminFetch(
        `/api/admin/google-business/locations?accountId=${encodeURIComponent(accountId)}`,
      );
      setLocations(data.locations ?? []);
      if (typeof data.warning === "string" && data.warning.trim()) {
        onMessage({ ok: data.warning.trim() });
      }
    } catch (e) {
      onMessage({ err: e instanceof Error ? e.message : "Could not list locations" });
    } finally {
      setBusy(null);
    }
  }

  async function saveLocation(loc: GbpLocation) {
    setBusy("location");
    try {
      const data = await adminFetch("/api/admin/google-business/settings", {
        method: "PATCH",
        body: JSON.stringify({
          accountId: loc.accountId,
          locationId: loc.locationId,
          locationTitle: loc.title,
        }),
      });
      setSettings(data.settings);
      onMessage({ ok: `Location set: ${loc.title}` });
    } catch (e) {
      onMessage({ err: e instanceof Error ? e.message : "Save location failed" });
    } finally {
      setBusy(null);
    }
  }

  async function saveManualIds() {
    setBusy("manual-ids");
    try {
      const data = await adminFetch("/api/admin/google-business/settings", {
        method: "PATCH",
        body: JSON.stringify({
          accountId: manualAccountId.trim(),
          locationId: manualLocationId.trim(),
          locationTitle: manualLocationTitle.trim(),
        }),
      });
      setSettings(data.settings);
      if (data.settings?.accountId) {
        setSelectedAccount(data.settings.accountId);
      }
      onMessage({
        ok: "Saved Account / Location IDs. You can send a test post if OAuth is connected; listing APIs are not required.",
      });
    } catch (e) {
      onMessage({ err: e instanceof Error ? e.message : "Save manual IDs failed" });
    } finally {
      setBusy(null);
    }
  }

  async function sendTestPost() {
    setBusy("test");
    try {
      await adminFetch("/api/admin/google-business/test-post", { method: "POST" });
      await loadStatus();
      onMessage({ ok: "Test post sent — check your Google Business Profile." });
    } catch (e) {
      onMessage({ err: e instanceof Error ? e.message : "Test post failed" });
    } finally {
      setBusy(null);
    }
  }

  if (!settings) {
    return (
      <p className="mt-4 text-sm text-ocean-600">Loading Google Business settings…</p>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-ocean-100 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-bold text-ocean-900">
        Google Business Profile
      </h2>
      <p className="mt-2 text-sm text-ocean-700">
        When a blog is auto-published, also create an <strong>Update</strong> post on your
        scuba diving Google Business Profile (title, excerpt, photo, link to the blog).
      </p>
      <p className="mt-2 rounded-lg border border-ocean-100 bg-ocean-50 px-3 py-2 text-xs text-ocean-700">
        <strong>Google Cloud APIs</strong> (search these exact names in API Library — there is
        no single “Google Business API”):{" "}
        <em>Google My Business API</em>, <em>My Business Account Management API</em>,{" "}
        <em>My Business Business Information API</em>.
      </p>

      {!clientConfigured ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Add <code className="text-xs">GOOGLE_BUSINESS_CLIENT_ID</code> and{" "}
          <code className="text-xs">GOOGLE_BUSINESS_CLIENT_SECRET</code> in Vercel →
          Environment Variables, then redeploy. See{" "}
          <code className="text-xs">docs/GOOGLE-BUSINESS-PROFILE-SETUP.md</code> for the
          full step-by-step guide.
        </p>
      ) : null}

      <ul className="mt-4 space-y-1 text-sm text-ocean-800">
        <li>
          OAuth:{" "}
          {settings.hasRefreshToken ? (
            <span className="font-semibold text-green-700">Connected</span>
          ) : (
            <span className="text-amber-700">Not connected</span>
          )}
          {settings.hasRefreshToken && !settings.configured ? (
            <span className="text-ocean-600">
              {" "}
              — use <strong>Load accounts</strong> or enter <strong>manual IDs</strong> below
            </span>
          ) : null}
        </li>
        <li>
          Location:{" "}
          {settings.locationTitle || settings.locationId ? (
            <span className="font-medium">
              {settings.locationTitle || settings.locationId}
            </span>
          ) : (
            <span className="text-ocean-500">Not selected yet</span>
          )}
        </li>
        {settings.lastPostAt ? (
          <li className="text-ocean-600">
            Last post: {new Date(settings.lastPostAt).toLocaleString("en-IN")}{" "}
            {settings.lastPostSlug ? `(/blog/${settings.lastPostSlug})` : ""}
          </li>
        ) : null}
        {settings.lastPostError ? (
          <li className="text-red-700">Last error: {settings.lastPostError}</li>
        ) : null}
      </ul>

      {redirectUri ? (
        <p className="mt-3 text-xs text-ocean-500">
          OAuth redirect URI (add in Google Cloud Console):{" "}
          <code className="break-all">{redirectUri}</code>
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!clientConfigured || busy != null}
          onClick={() => void connectGoogle()}
          className="rounded-full bg-ocean-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === "connect" ? "Redirecting…" : "Connect Google account"}
        </button>
        <button
          type="button"
          disabled={!settings.hasRefreshToken || busy != null}
          onClick={() => void loadAccounts()}
          className="rounded-full border border-ocean-300 px-4 py-2 text-sm font-semibold text-ocean-900 disabled:opacity-50"
        >
          {busy === "accounts" ? "Loading…" : "Load accounts"}
        </button>
        <p className="w-full text-xs text-ocean-700">
          Google&apos;s <strong>list accounts / list locations</strong> APIs have a{" "}
          <strong>small per-day quota</strong> on each Cloud project. Waiting 20–30 minutes
          often does not fix it once the daily cap is hit. Use{" "}
          <strong>manual IDs</strong> below (recommended when this keeps failing), try again
          tomorrow, or use a dedicated Google Cloud project with the three Business APIs
          enabled.
        </p>
        <button
          type="button"
          disabled={!settings.configured || busy != null}
          onClick={() => void sendTestPost()}
          className="rounded-full border border-ocean-300 px-4 py-2 text-sm font-semibold text-ocean-900 disabled:opacity-50"
        >
          Send test post
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50/90 p-4">
        <h3 className="text-sm font-bold text-ocean-900">Manual account and location IDs</h3>
        <p className="mt-2 text-xs text-ocean-700">
          If <strong>Load accounts</strong> never works, paste your numeric{" "}
          <strong>Account ID</strong> and <strong>Location ID</strong> here. Posting to your
          profile uses OAuth and the post API only — listing APIs are optional. You can paste
          a full resource name such as{" "}
          <code className="rounded bg-white px-1 text-[11px]">
            accounts/123/locations/456
          </code>{" "}
          into either ID field; we normalize it on save. See{" "}
          <code className="text-[11px]">docs/GOOGLE-BUSINESS-PROFILE-SETUP.md</code> for where
          to find IDs.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-ocean-800">
            Account ID
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2 font-mono text-xs"
              value={manualAccountId}
              onChange={(e) => setManualAccountId(e.target.value)}
              placeholder="e.g. 12345678901234567890"
              autoComplete="off"
            />
          </label>
          <label className="block text-xs font-medium text-ocean-800">
            Location ID
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2 font-mono text-xs"
              value={manualLocationId}
              onChange={(e) => setManualLocationId(e.target.value)}
              placeholder="e.g. 98765432109876543210"
              autoComplete="off"
            />
          </label>
          <label className="block text-xs font-medium text-ocean-800 sm:col-span-2">
            Location title (label in admin)
            <input
              className="mt-1 w-full rounded-lg border border-ocean-200 px-2 py-2 text-sm"
              value={manualLocationTitle}
              onChange={(e) => setManualLocationTitle(e.target.value)}
              placeholder="Your business name as shown on Google Maps"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy != null || !manualAccountId.trim() || !manualLocationId.trim()}
          onClick={() => void saveManualIds()}
          className="mt-4 rounded-full bg-ocean-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === "manual-ids" ? "Saving…" : "Save manual IDs"}
        </button>
      </div>

      <label className="mt-5 flex items-center gap-2 text-sm font-medium text-ocean-800">
        <input
          type="checkbox"
          checked={settings.enabled}
          disabled={!settings.configured || busy != null}
          onChange={(e) => void saveEnabled(e.target.checked)}
        />
        Auto-post each new blog to Google Business
      </label>

      {accounts.length > 0 ? (
        <div className="mt-4">
          <label className="text-sm text-ocean-800">
            Google account
            <select
              className="mt-1 block w-full max-w-md rounded-lg border border-ocean-200 px-2 py-2"
              value={selectedAccount}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedAccount(id);
                if (id) void loadLocations(id);
              }}
            >
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.accountId} value={a.accountId}>
                  {a.accountName} ({a.accountId})
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {locations.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-medium text-ocean-800">Choose your business location</p>
          <ul className="mt-2 space-y-2">
            {locations.map((loc) => (
              <li key={loc.locationId}>
                <button
                  type="button"
                  disabled={busy != null}
                  onClick={() => void saveLocation(loc)}
                  className={`w-full max-w-md rounded-lg border px-3 py-2 text-left text-sm ${
                    settings.locationId === loc.locationId
                      ? "border-ocean-600 bg-ocean-50 font-semibold"
                      : "border-ocean-200 hover:bg-ocean-50"
                  }`}
                >
                  {loc.title}
                  <span className="mt-0.5 block text-xs text-ocean-500">
                    {loc.locationId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
