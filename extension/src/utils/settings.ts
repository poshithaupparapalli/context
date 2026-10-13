export type ThemeSetting = "auto" | "light" | "dark";

export interface Settings {
  serverUrl: string;
  theme: ThemeSetting;
}

export const DEFAULT_SETTINGS: Settings = {
  serverUrl: "http://localhost:8787",
  theme: "auto",
};

const KEY = "ctx-settings";

export function normalizeServerUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed || DEFAULT_SETTINGS.serverUrl;
}

export async function getSettings(): Promise<Settings> {
  try {
    const stored = (await chrome.storage.local.get(KEY))[KEY] as Partial<Settings> | undefined;
    return {
      serverUrl: normalizeServerUrl(stored?.serverUrl ?? DEFAULT_SETTINGS.serverUrl),
      theme: stored?.theme === "light" || stored?.theme === "dark" ? stored.theme : "auto",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  next.serverUrl = normalizeServerUrl(next.serverUrl);
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}

export function onSettingsChanged(listener: (settings: Settings) => void): () => void {
  const handler = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === "local" && changes[KEY]) void getSettings().then(listener);
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

const COUNTER_KEY = "ctx-counter";

/** A running archival number: every card you open gets the next one. */
export async function nextReferenceNumber(): Promise<number> {
  try {
    const current = Number((await chrome.storage.local.get(COUNTER_KEY))[COUNTER_KEY]) || 0;
    const next = current + 1;
    await chrome.storage.local.set({ [COUNTER_KEY]: next });
    return next;
  } catch {
    return 1;
  }
}

export function formatReference(n: number): string {
  return String(n).padStart(3, "0");
}
