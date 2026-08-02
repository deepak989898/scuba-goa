/**
 * In-tab TTL cache so multiple hooks (Hero, Booking, Chatbot) do not each
 * re-fetch the same Firestore collection on every mount.
 */

type Entry<T> = { at: number; value: T };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export async function cachedCmsFetch<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && Date.now() - hit.at < ttlMs) {
    return hit.value;
  }

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const p = loader()
    .then((value) => {
      store.set(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, p);
  return p;
}
