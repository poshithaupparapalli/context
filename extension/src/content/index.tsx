import { createRoot } from "react-dom/client";
import css from "../styles/content.css?inline";
import type { ContentMessage } from "../utils/messages";
import { App } from "./App";
import { createBus } from "./bus";
import { readSelection, watchSelection } from "./selection";

declare global {
  interface Window {
    __contextExtensionLoaded?: boolean;
  }
}

const HOST_TAG = "context-reading-companion";

/**
 * Entry point. The page only ever receives one custom element, appended to
 * <html> and created the first time it's needed. Everything visual lives in
 * its shadow root, so page CSS can't reach in and ours can't leak out.
 */
function main() {
  if (window.__contextExtensionLoaded) return;
  window.__contextExtensionLoaded = true;

  const bus = createBus();
  let host: HTMLElement | null = null;

  const ensureUi = () => {
    if (host) return;
    host = document.createElement(HOST_TAG);
    const shadow = host.attachShadow({ mode: "open" });

    // Adopted stylesheets are exempt from the page's style-src CSP; <style> is the fallback.
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      shadow.adoptedStyleSheets = [sheet];
    } catch {
      const style = document.createElement("style");
      style.textContent = css;
      shadow.appendChild(style);
    }

    const mount = document.createElement("div");
    shadow.appendChild(mount);
    document.documentElement.appendChild(host);
    createRoot(mount).render(<App bus={bus} host={host} />);
  };

  watchSelection(
    {
      onSelect: (captured) => {
        ensureUi();
        bus.emit({ type: "select", captured });
      },
      onClear: () => {
        if (host) bus.emit({ type: "clear" });
      },
    },
    () => host,
  );

  chrome.runtime.onMessage.addListener((message: ContentMessage, _sender, sendResponse) => {
    if (message?.type !== "context:explain-selection") return false;
    const captured = readSelection(host);
    if (captured) {
      ensureUi();
      bus.emit({ type: "open", captured });
    }
    sendResponse({ ok: Boolean(captured) });
    return false;
  });
}

main();
