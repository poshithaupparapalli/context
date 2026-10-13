/**
 * A small persistent cache in chrome.storage.local so asking about the same
 * phrase in the same passage twice costs nothing. The service worker can be
 * killed at any time, so nothing lives in memory.
 */

const KEY = "ctx-cache-v1";
const MAX_ENTRIES = 120;
const TTL_MS = 14 * 24 * 60 * 60 * 1000;

interface Entry {
  t: number;
  v: unknown;
}
type Store = Record<string, Entry>;

let queue: Promise<unknown> = Promise.resolve();
/** Serialises read-modify-write so concurrent requests don't clobber each other. */
function exclusive<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

async function read(): Promise<Store> {
  return ((await chrome.storage.local.get(KEY))[KEY] as Store | undefined) ?? {};
}

export function cacheGet<T>(key: string, now = Date.now()): Promise<T | undefined> {
  return exclusive(async () => {
    const entry = (await read())[key];
    if (!entry || now - entry.t > TTL_MS) return undefined;
    return entry.v as T;
  });
}

export function cacheSet(key: string, value: unknown, now = Date.now()): Promise<void> {
  return exclusive(async () => {
    const store = await read();
    store[key] = { t: now, v: value };
    const keys = Object.keys(store);
    if (keys.length > MAX_ENTRIES) {
      keys
        .sort((a, b) => (store[a]?.t ?? 0) - (store[b]?.t ?? 0))
        .slice(0, keys.length - MAX_ENTRIES)
        .forEach((k) => delete store[k]);
    }
    await chrome.storage.local.set({ [KEY]: store });
  });
}

export function cacheClear(): Promise<void> {
  return exclusive(() => chrome.storage.local.remove(KEY));
}

/** Stable key: operation + page + selection + passage. Query strings and hashes are ignored. */
export async function cacheKeyFor(op: string, parts: { selection: string; paragraph?: string; url?: string }): Promise<string> {
  const raw = JSON.stringify([
    op,
    parts.selection.trim().toLowerCase().replace(/\s+/g, " "),
    (parts.url ?? "").split(/[?#]/)[0],
    (parts.paragraph ?? "").trim().replace(/\s+/g, " "),
  ]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
