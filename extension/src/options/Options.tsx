import type { HealthResponse } from "@context/shared";
import { useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  getSettings,
  normalizeServerUrl,
  updateSettings,
  type ThemeSetting,
} from "../utils/settings";

type Check =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; health: HealthResponse }
  | { state: "error"; message: string };

const THEMES: { value: ThemeSetting; label: string; hint: string }[] = [
  { value: "auto", label: "Match the page", hint: "Light on light pages, dark on dark ones." },
  { value: "light", label: "Paper", hint: "Always the warm light card." },
  { value: "dark", label: "Ink", hint: "Always the dark card." },
];

export async function checkServer(serverUrl: string, fetchImpl: typeof fetch = fetch): Promise<Check> {
  try {
    const res = await fetchImpl(`${serverUrl}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { state: "error", message: `The server answered with ${res.status}.` };
    return { state: "ok", health: (await res.json()) as HealthResponse };
  } catch {
    return { state: "error", message: `Nothing is answering at ${serverUrl}. Is the server running?` };
  }
}

export function Options() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SETTINGS.serverUrl);
  const [theme, setTheme] = useState<ThemeSetting>("auto");
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [saved, setSaved] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    void getSettings().then((s) => {
      setServerUrl(s.serverUrl);
      setTheme(s.theme);
    });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const save = async () => {
    const next = await updateSettings({ serverUrl, theme });
    setServerUrl(next.serverUrl);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const test = async () => {
    setCheck({ state: "checking" });
    setCheck(await checkServer(normalizeServerUrl(serverUrl)));
  };

  const clearCache = async () => {
    await chrome.runtime.sendMessage({ type: "context:clear-cache" });
    setCleared(true);
    window.setTimeout(() => setCleared(false), 1800);
  };

  return (
    <div className="ctx-root" data-theme={dark ? "dark" : "light"}>
      <main className="mx-auto w-full max-w-[640px] px-8 py-16">
        <div className="flex items-center gap-2 mb-10">
          <span className="block w-1.5 h-1.5 bg-cobalt" />
          <span className="ctx-label !text-ink">Context / Settings</span>
        </div>

        <h1 className="m-0 font-serif text-[64px] leading-[60px] text-ink">Context</h1>
        <p className="m-0 mt-3 font-serif italic text-2xl text-ink-2">Understand more. Keep reading.</p>

        <hr className="ctx-rule mt-10 mb-8" />

        <section>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="ctx-label-accent">01</span>
            <span className="ctx-label">/</span>
            <h2 className="ctx-label m-0 !text-ink">Server</h2>
          </div>
          <label htmlFor="server" className="block text-sm text-ink-2 mb-1">
            Where your Context server is running.
          </label>
          <input
            id="server"
            className="ctx-field"
            value={serverUrl}
            spellCheck={false}
            onChange={(e) => setServerUrl(e.target.value)}
          />
          <div className="flex items-center gap-3 mt-4">
            <button type="button" className="ctx-btn" onClick={test} disabled={check.state === "checking"}>
              {check.state === "checking" ? "Checking…" : "Test connection"}
            </button>
          </div>
          {check.state === "ok" && (
            <p className="m-0 mt-3 text-sm" role="status">
              <span className="ctx-label-accent mr-2">Connected</span>
              {check.health.configured
                ? `${check.health.provider} · ${check.health.fastModel} / ${check.health.deepModel}`
                : "The server is up, but no API key is configured yet. Add one to server/.env and restart it."}
            </p>
          )}
          {check.state === "error" && (
            <p className="m-0 mt-3 text-sm" role="alert">
              <span className="ctx-label-accent mr-2">Not reachable</span>
              {check.message}
            </p>
          )}
        </section>

        <hr className="ctx-rule my-8" />

        <section>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="ctx-label-accent">02</span>
            <span className="ctx-label">/</span>
            <h2 className="ctx-label m-0 !text-ink">Appearance</h2>
          </div>
          <div role="radiogroup" aria-label="Card appearance" className="flex flex-col gap-3">
            {THEMES.map((t) => (
              <label key={t.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value={t.value}
                  checked={theme === t.value}
                  onChange={() => setTheme(t.value)}
                  className="mt-1.5 accent-[rgb(38,56,217)]"
                />
                <span>
                  <span className="block font-serif text-xl text-ink">{t.label}</span>
                  <span className="block text-sm text-ink-2">{t.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-4 mt-8">
          <button type="button" className="ctx-btn" onClick={save}>
            Save settings
          </button>
          {saved && <span className="ctx-label-accent">Saved</span>}
        </div>

        <hr className="ctx-rule my-8" />

        <section>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="ctx-label-accent">03</span>
            <span className="ctx-label">/</span>
            <h2 className="ctx-label m-0 !text-ink">Saved explanations</h2>
          </div>
          <p className="m-0 mb-4 text-sm text-ink-2">
            Explanations are kept on this device for two weeks so asking about the same passage twice is instant.
            Nothing is synced anywhere.
          </p>
          <div className="flex items-center gap-4">
            <button type="button" className="ctx-btn" onClick={clearCache}>
              Clear saved explanations
            </button>
            {cleared && <span className="ctx-label-accent">Cleared</span>}
          </div>
        </section>
      </main>
    </div>
  );
}
