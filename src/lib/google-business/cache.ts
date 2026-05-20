import { getAdminDb } from "@/lib/firebase-admin";
import type { GbpLocation } from "@/lib/google-business/client";

const CACHE_DOC = "blogAutomation/googleBusinessCache";
const TTL_MS = 15 * 60 * 1000;

type CacheDoc = {
  accounts?: { accountId: string; accountName: string }[];
  accountsFetchedAt?: string;
  locationsByAccount?: Record<
    string,
    { locations: GbpLocation[]; fetchedAt: string }
  >;
};

async function readCache(): Promise<CacheDoc> {
  const db = getAdminDb();
  if (!db) return {};
  const snap = await db.doc(CACHE_DOC).get();
  return (snap.data() as CacheDoc) ?? {};
}

async function writeCache(patch: Partial<CacheDoc>): Promise<void> {
  const db = getAdminDb();
  if (!db) return;
  const current = await readCache();
  await db.doc(CACHE_DOC).set({ ...current, ...patch }, { merge: true });
}

function isFresh(iso: string | undefined): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < TTL_MS;
}

export async function getCachedGoogleBusinessAccounts(): Promise<
  { accountId: string; accountName: string }[] | null
> {
  const c = await readCache();
  if (!c.accounts?.length || !isFresh(c.accountsFetchedAt)) return null;
  return c.accounts;
}

export async function setCachedGoogleBusinessAccounts(
  accounts: { accountId: string; accountName: string }[],
): Promise<void> {
  await writeCache({
    accounts,
    accountsFetchedAt: new Date().toISOString(),
  });
}

export async function getCachedGoogleBusinessLocations(
  accountId: string,
): Promise<GbpLocation[] | null> {
  const c = await readCache();
  const entry = c.locationsByAccount?.[accountId];
  if (!entry?.locations?.length || !isFresh(entry.fetchedAt)) return null;
  return entry.locations;
}

export async function setCachedGoogleBusinessLocations(
  accountId: string,
  locations: GbpLocation[],
): Promise<void> {
  const c = await readCache();
  const locationsByAccount = { ...(c.locationsByAccount ?? {}) };
  locationsByAccount[accountId] = {
    locations,
    fetchedAt: new Date().toISOString(),
  };
  await writeCache({ locationsByAccount });
}

export function isGoogleQuotaError(message: string): boolean {
  return /quota exceeded|rate limit|429|too many requests/i.test(message);
}

export function formatGoogleQuotaError(message: string): string {
  if (!isGoogleQuotaError(message)) return message;
  return (
    "Google API rate limit reached (too many requests per minute). " +
    "Wait 2–3 minutes, then click Load accounts once. " +
    "If it keeps happening, request a quota increase in Google Cloud Console → " +
    "APIs → My Business Account Management API → Quotas."
  );
}
