import { getAdminDb } from "@/lib/firebase-admin";

const CACHE_DOC = "blogAutomation/googleBusinessApiCache";
/** Google list APIs are strict — cache 24h; use manual IDs if still rate-limited. */
const TTL_MS = 24 * 60 * 60 * 1000;

type CacheDoc = {
  accounts?: { accountId: string; accountName: string }[];
  accountsFetchedAt?: number;
  locationsByAccount?: Record<
    string,
    { locations: { accountId: string; locationId: string; title: string }[]; fetchedAt: number }
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

export async function getCachedGoogleBusinessAccounts(): Promise<
  { accountId: string; accountName: string }[] | null
> {
  const c = await readCache();
  if (!c.accounts?.length || !c.accountsFetchedAt) return null;
  if (Date.now() - c.accountsFetchedAt > TTL_MS) return null;
  return c.accounts;
}

/** Last good accounts list even if TTL expired (for rate-limit fallback). */
export async function getStaleCachedGoogleBusinessAccounts(): Promise<
  { accountId: string; accountName: string }[] | null
> {
  const c = await readCache();
  if (!c.accounts?.length) return null;
  return c.accounts;
}

export async function setCachedGoogleBusinessAccounts(
  accounts: { accountId: string; accountName: string }[],
): Promise<void> {
  await writeCache({ accounts, accountsFetchedAt: Date.now() });
}

export async function getCachedGoogleBusinessLocations(
  accountId: string,
): Promise<{ accountId: string; locationId: string; title: string }[] | null> {
  const c = await readCache();
  const row = c.locationsByAccount?.[accountId];
  if (!row?.locations?.length || !row.fetchedAt) return null;
  if (Date.now() - row.fetchedAt > TTL_MS) return null;
  return row.locations;
}

export async function getStaleCachedGoogleBusinessLocations(
  accountId: string,
): Promise<{ accountId: string; locationId: string; title: string }[] | null> {
  const c = await readCache();
  const row = c.locationsByAccount?.[accountId];
  if (!row?.locations?.length) return null;
  return row.locations;
}

export async function setCachedGoogleBusinessLocations(
  accountId: string,
  locations: { accountId: string; locationId: string; title: string }[],
): Promise<void> {
  const c = await readCache();
  await writeCache({
    locationsByAccount: {
      ...(c.locationsByAccount ?? {}),
      [accountId]: { locations, fetchedAt: Date.now() },
    },
  });
}
